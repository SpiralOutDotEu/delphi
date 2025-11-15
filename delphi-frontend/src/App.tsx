import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Landing } from "./pages/Landing";
import { OwnedObjectsPage } from "./pages/OwnedObjectsPage";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/objects" element={<OwnedObjectsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
