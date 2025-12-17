import { useRef, useEffect } from 'react';
import useStore from '../store/useStore';
import CandidateOverlay from './CandidateOverlay';

const VideoPlayer = ({ stream, muted, label, isLocal }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-slate-800 rounded-xl overflow-hidden aspect-video shadow-lg group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
      />
      <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-md text-sm font-medium backdrop-blur-sm">
        {label} {isLocal && '(You)'}
      </div>
    </div>
  );
};

export default function VideoGrid() {
  const { localStream, peers, role } = useStore();

  return (
    <div className="relative w-full max-w-6xl mx-auto p-4 flex-1 flex flex-col justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
        {/* Candidate Privacy Overlay logic is handled inside here if we want it to cover SPECIFIC videos, 
            but blocking the whole grid is safer/easier as per top level overlay component. 
            We will assume the overlay is at Room level (covering this grid). */}
        
        {localStream && (
          <VideoPlayer 
            stream={localStream} 
            muted={true} 
            label={role} 
            isLocal={true} 
          />
        )}

        {Object.entries(peers).map(([id, peer]) => (
            <VideoPlayer
              key={id}
              stream={peer.stream}
              muted={false}
              label={peer.role || 'Peer'}
              isLocal={false}
            />
        ))}
      </div>
    </div>
  );
}
