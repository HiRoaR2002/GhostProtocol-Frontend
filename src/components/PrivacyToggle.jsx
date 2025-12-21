import { Lock, Unlock } from 'lucide-react';
import useStore from '../store/useStore';

export default function PrivacyToggle() {
  const { role, privacyMode, setPrivacyMode, socket } = useStore();

  if (role !== 'INTERVIEWER') return null;

  const toggle = () => {
    const newMode = !privacyMode;
    setPrivacyMode(newMode);
    if (socket) {
      socket.send(JSON.stringify({ 
        type: 'toggle_privacy',
        is_active: newMode
      }));
    }
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg ${
        privacyMode
          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border-2 border-red-400'
          : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
      }`}
    >
      {privacyMode ? <Lock size={20} /> : <Unlock size={20} />}
      {privacyMode ? 'PRIVATE MODE ACTIVE' : 'Enter Private Mode'}
    </button>
  );
}
