import "../style/header.css";
import logo from "../assets/image.png"; // your logo image
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  return (
    <header className="header">
      <div  onClick={() => navigate("/Dashboard")} className="header-left">
        <img src={logo} alt="Gangadhar Provision Store" className="logo" />
      </div>

      <div  onClick={() => navigate("/Dashboard")} className="header-center">
        <h2>Gangadhar Provision Store</h2>
        <p>Billing & Monthly Account System</p>
      </div>

      <div className="header-right">
        <span>Owner: Gangadhar</span>
      </div>
    </header>
  );
}

export default Header;