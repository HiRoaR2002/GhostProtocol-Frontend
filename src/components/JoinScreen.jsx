import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, Users, User } from 'lucide-react';

export default function JoinScreen() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const join = (role) => {
    const finalCode = code || 'demo-room';
    navigate(`/room/${finalCode}?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Branding */}
        <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                <Ghost size={32} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight">
                Ghost<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Protocol</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed">
                The privacy-first technical interview platform. 
                Toggle "Glass Wall" mode to deliberate privately without disconnecting.
            </p>
            
            <div className="pt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="font-semibold text-white mb-1">Standard Mode</div>
                    <div className="text-sm text-slate-500">Full A/V connectivity for all participants.</div>
                </div>
                 <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                    <div className="font-semibold text-white mb-1">Ghost Mode</div>
                    <div className="text-sm text-slate-500">Interviewers switch to private channel instantly.</div>
                </div>
            </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Join Session</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Room Code</label>
                    <input 
                        type="text" 
                        value={code} 
                        onChange={(e) => setCode(e.target.value)} 
                        placeholder="e.g. interview-101"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                    <button 
                        onClick={() => join('INTERVIEWER')}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Users size={20} />
                        Join as Interviewer
                    </button>
                    <button 
                        onClick={() => join('CANDIDATE')}
                        className="flex items-center justify-center gap-3 w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <User size={20} />
                        Join as Candidate
                    </button>
                </div>
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">
                Powered by Pion WebRTC & Go
            </div>
        </div>

      </div>
    </div>
  );
}
