import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinScreen from './components/JoinScreen';
import Room from './components/Room';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinScreen />} />
        <Route path="/room/:roomCode" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
