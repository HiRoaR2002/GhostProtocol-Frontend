import useStore from '../store/useStore';
import { ShieldAlert } from 'lucide-react';

export default function CandidateOverlay() {
  const { role, privacyMode } = useStore();

  if (role !== 'CANDIDATE' || !privacyMode) return null;

  return (
    <div className="absolute inset-0 z-50 backdrop-blur-xl bg-slate-900/80 flex flex-col items-center justify-center text-center p-8 transition-all duration-500">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-amber-500/20 p-4 rounded-full">
            <ShieldAlert size={48} className="text-amber-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Interviewers are Deliberating</h2>
        <p className="text-slate-400">
          Your audio and video are still connected, but you cannot hear the interviewers at this time.
        </p>
        <div className="mt-6 flex justify-center gap-2">
            <span className="animate-bounce w-2 h-2 bg-slate-500 rounded-full"></span>
            <span className="animate-bounce w-2 h-2 bg-slate-500 rounded-full delay-100"></span>
            <span className="animate-bounce w-2 h-2 bg-slate-500 rounded-full delay-200"></span>
        </div>
      </div>
    </div>
  );
}
