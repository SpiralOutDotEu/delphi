import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Landing } from "./pages/Landing";
import { OwnedObjectsPage } from "./pages/OwnedObjectsPage";
import { AdminPage } from "./pages/AdminPage";
import { CreateMarketPage } from "./pages/CreateMarketPage";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/objects" element={<OwnedObjectsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/create-market" element={<CreateMarketPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
