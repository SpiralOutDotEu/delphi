import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Landing } from "./pages/Landing";
import { MyPositionsPage } from "./pages/MyPositionsPage";
import { AdminPage } from "./pages/AdminPage";
import { CreateMarketPage } from "./pages/CreateMarketPage";
import { ExplorePage } from "./pages/ExplorePage";
import { MarketDetailPage } from "./pages/MarketDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/positions" element={<MyPositionsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/create-market" element={<CreateMarketPage />} />
        <Route path="/market/:marketId" element={<MarketDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
