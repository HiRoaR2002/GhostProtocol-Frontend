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

    const pcRefs = useRef({}); // Map<peerId, RTCPeerConnection>
    const wsRef = useRef(null);
    const [status, setStatus] = useState('Connecting...');

    useEffect(() => {
        setRoomCode(roomCode);
        setRole(roleParam === 'INTERVIEWER' ? 'INTERVIEWER' : 'CANDIDATE');
    }, [roomCode, roleParam, setRoomCode, setRole]);

    useEffect(() => {
        const myId = String(Math.floor(Math.random() * 100000));
        let localMediaStream = null;

        const init = async () => {
            try {
                // 1. Get User Media
                localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .catch(e => {
                        console.warn("No device, using fake", e);
                        const s = new MediaStream();
                        s.addTrack(createEmptyAudioTrack());
                        s.addTrack(createEmptyVideoTrack({ width: 640, height: 480 }));
                        return s;
                    });
                setLocalStream(localMediaStream);

                // 2. Connect WS
                const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
                const wsUrl = `${wsBaseUrl}/ws/${roomCode}?role=${roleParam || 'CANDIDATE'}&id=${myId}`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;
                setSocket(ws);

                ws.onopen = () => setStatus('Signaling Connected');
                ws.onclose = () => setStatus('Disconnected from Signaling');
                ws.onerror = (e) => console.error("WS Error", e);

                ws.onmessage = async (event) => {
                    const msg = JSON.parse(event.data);
                    const { type, sender, id } = msg;

                    switch (type) {
                        case 'user-joined':
                            // New user joined, WE initiate the call
                            setStatus(`User ${id} Joined`);
                            createPeerConnection(id, true, localMediaStream, ws);
                            break;

                        case 'user-left':
                            if (pcRefs.current[id]) {
                                pcRefs.current[id].close();
                                delete pcRefs.current[id];
                                // Also remove from store (UI)
                                // removePeer(id); // You might need to add this to useStore
                            }
                            break;

                        case 'offer':
                            // We received an offer, we answer
                            await handleOffer(msg, localMediaStream, ws);
                            break;

                        case 'answer':
                            await handleAnswer(msg);
                            break;

                        case 'candidate':
                            await handleCandidate(msg);
                            break;
                        
                        case 'toggle_privacy':
                             setPrivacyMode(msg.is_active);
                             break;
                    }
                };

            } catch (err) {
                console.error("Init Error", err);
                setStatus(`Error: ${err.message}`);
            }
        };

        const createPeerConnection = async (targetId, isInitiator, stream, ws) => {
            if (pcRefs.current[targetId]) return pcRefs.current[targetId];

            console.log(`Creating PC for ${targetId} (Initiator: ${isInitiator})`);
            
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRefs.current[targetId] = pc;

            // Add Local Tracks
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Handle ICE
            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    ws.send(JSON.stringify({
                        type: 'candidate',
                        target: targetId,
                        candidate: e.candidate
                    }));
                }
            };
            
            pc.oniceconnectionstatechange = () => console.log(`${targetId} ICE: ${pc.iceConnectionState}`);

            // Handle Remote Stream
            pc.ontrack = (e) => {
                console.log("Got Remote Track from " + targetId);
                const remoteStream = e.streams[0] || new MediaStream([e.track]);
                addPeer(targetId, { stream: remoteStream, role: `User ${targetId}` });
            };

            // If Initiator, Create Offer
            if (isInitiator) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({
                    type: 'offer',
                    target: targetId,
                    sdp: offer.sdp
                }));
            }

            return pc;
        };

        const handleOffer = async (msg, stream, ws) => {
            const pc = await createPeerConnection(msg.sender, false, stream, ws);
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({
                type: 'answer',
                target: msg.sender,
                sdp: answer.sdp
            }));
        };

        const handleAnswer = async (msg) => {
            const pc = pcRefs.current[msg.sender];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
            }
        };

        const handleCandidate = async (msg) => {
            const pc = pcRefs.current[msg.sender];
            if (pc) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
        };

        if (roomCode) init();

        return () => {
            if (wsRef.current) wsRef.current.close();
            Object.values(pcRefs.current).forEach(pc => pc.close());
        };
    }, [roomCode, roleParam]);

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
