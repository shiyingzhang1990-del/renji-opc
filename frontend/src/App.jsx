import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import MerchantPage from "./pages/MerchantPage";
import DashboardPage from "./pages/DashboardPage";
import ContentPage from "./pages/ContentPage";
import OrderPage from "./pages/OrderPage";
import AdminPage from "./pages/AdminPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/market" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/merchant" element={<MerchantPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/content/:slug" element={<ContentPage />} />
        <Route path="/order/:productId" element={<OrderPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
      <Footer />
    </>
  );
}
