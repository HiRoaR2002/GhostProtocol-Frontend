import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import useStore from '../store/useStore';
import VideoGrid from './VideoGrid';
import PrivacyToggle from './PrivacyToggle';
import CandidateOverlay from './CandidateOverlay';

// Helper to create empty media stream if no device
const createEmptyAudioTrack = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    return dst.stream.getAudioTracks()[0];
};

const createEmptyVideoTrack = ({ width, height }) => {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return stream.getVideoTracks()[0];
};

export default function Room() {
    const { roomCode } = useParams();
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role');
    
    const { 
        setRole, 
        setRoomCode, 
        setPrivacyMode, 
        setLocalStream, 
        setSocket,
        addPeer,
        peers
    } = useStore();

    const pcRef = useRef(null);
    const wsRef = useRef(null);
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        setRoomCode(roomCode);
        setRole(roleParam === 'INTERVIEWER' ? 'INTERVIEWER' : 'CANDIDATE');
    }, [roomCode, roleParam, setRoomCode, setRole]);

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Get User Media
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .catch(err => {
                         console.warn("No cam/mic, using fake", err);
                         const s = new MediaStream();
                         s.addTrack(createEmptyAudioTrack());
                         s.addTrack(createEmptyVideoTrack({ width: 640, height: 480 }));
                         return s;
                    });
                
                setLocalStream(stream);

                // 2. Connect WS
                // Use native WebSocket or a URL specific to environment
                const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
                const wsUrl = `${wsBaseUrl}/ws/${roomCode}?role=${roleParam || 'CANDIDATE'}&id=${Math.floor(Math.random() * 10000)}`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;
                setSocket(ws);

                ws.onopen = () => {
                    setStatus('Connected to Signaling Server');
                    createPeerConnection(stream, ws);
                };

                ws.onerror = (error) => {
                    console.error("WebSocket Error:", error);
                    setStatus('Connection Error: Check console');
                };

                ws.onclose = (event) => {
                    if (event.code !== 1000) {
                         setStatus(`Disconnected (Code: ${event.code})`);
                    }
                };

                ws.onmessage = async (event) => {
                    const msg = JSON.parse(event.data);
                    
                    switch (msg.type) {
                        case 'answer':
                            if (pcRef.current.signalingState === 'stable') {
                                console.warn("Received answer in stable state, ignoring (likely race condition or duplicate)");
                                break;
                            }
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription({
                                type: 'answer',
                                sdp: msg.sdp
                            }));
                            break;
                            
                        case 'offer':
                             // Handle server-sent offer (renegotiation)
                            await pcRef.current.setRemoteDescription(new RTCSessionDescription({
                                type: 'offer',
                                sdp: msg.sdp
                            }));
                            const answer = await pcRef.current.createAnswer();
                            await pcRef.current.setLocalDescription(answer);
                            ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
                            break;

                        case 'candidate':
                            if (msg.candidate) {
                                await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
                            }
                            break;

                        case 'privacy_state_change':
                            setPrivacyMode(msg.is_active);
                            break;
                    }
                };

            } catch (err) {
                console.error("Init Error", err);
                setStatus(`Error: ${err.message}`);
            }
        };

        const createPeerConnection = (stream, ws) => {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Handle ICE
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    ws.send(JSON.stringify({
                        type: 'candidate',
                        candidate: event.candidate
                    }));
                }
            };

            // Handle ICE Connection State
            pc.oniceconnectionstatechange = () => {
                console.log("ICE State:", pc.iceConnectionState);
                const state = pc.iceConnectionState;
                if (state === 'failed' || state === 'disconnected') {
                    setStatus(`ICE Error: ${state} (Check firewall/ports)`);
                } else if (state === 'connected' || state === 'completed') {
                    setStatus('Media Connected');
                } else {
                    setStatus(`ICE: ${state}...`);
                }
            };

            // Handle Remote Stream (Track based)
            pc.ontrack = (event) => {
                const stream = event.streams[0] || new MediaStream([event.track]);
                
                // Improved ID handling
                // Pion often sends streams with IDs, but if we lack signaling metadata about "Who owns this stream",
                // we have to rely on the stream ID.
                const peerId = stream.id; 
                
                console.log("New Remote Track:", event.track.kind, peerId);
                
                // For this demo, we label them "Remote User [ID]" since we don't have a user-map in signaling yet
                const label = `Remote User (${peerId.slice(0, 5)})`;
                
                addPeer(peerId, { stream, role: label });
            };

            // Negotiation Needed (Triggered when we add tracks usually, but we do it manually on start)
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
                } catch (err) {
                    console.error("Negot Error", err);
                }
            };
        };

        if (roomCode) {
            init();
        }

        return () => {
             // cleanup
             if (wsRef.current) wsRef.current.close();
             if (pcRef.current) pcRef.current.close();
        };
    }, [roomCode, roleParam]); // Run once per room/role

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col relative text-white font-sans">
             {/* Header */}
             <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur z-40">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">G</div>
                    <h1 className="text-xl font-bold tracking-tight">GhostProtocol <span className="text-slate-500 font-normal">| {roomCode}</span></h1>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-sm px-3 py-1 bg-slate-800 rounded-full text-slate-400">
                        Status: <span className={status.includes('Error') ? 'text-red-400' : 'text-emerald-400'}>{status}</span>
                     </span>
                     <div className="h-4 w-px bg-slate-700 mx-2"></div>
                     <PrivacyToggle />
                </div>
             </header>

             {/* Main Content */}
             <main className="flex-1 flex flex-col relative overflow-hidden">
                <CandidateOverlay />
                <VideoGrid />
             </main>
        </div>
    );
}
