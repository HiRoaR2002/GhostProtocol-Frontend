import { create } from 'zustand';

const useStore = create((set, get) => ({
  role: null, // 'INTERVIEWER' | 'CANDIDATE'
  roomCode: null,
  privacyMode: false,
  localStream: null,
  peers: {}, // { [id]: { stream: MediaStream, role: Role } }
  socket: null,

  setRole: (role) => set({ role }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPrivacyMode: (isActive) => set({ privacyMode: isActive }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setSocket: (socket) => set({ socket }),

  addPeer: (id, peerData) => set((state) => ({
    peers: { ...state.peers, [id]: { ...peerData } }
  })),

  removePeer: (id) => set((state) => {
    const { [id]: removed, ...rest } = state.peers;
    return { peers: rest };
  }),

  setPeerStream: (id, stream) => set((state) => ({
    peers: {
      ...state.peers,
      [id]: { ...state.peers[id], stream }
    }
  })),
}));

export default useStore;
