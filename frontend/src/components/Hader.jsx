import "../style/header.css";
import logo from "../assets/image.png"; // your logo image
import { useNavigate } from "react-router-dom";
import { isPrinterConnected, getPrinterName, connectPrinter, disconnectPrinter } from "../utils/printer";
import { useState, useEffect } from "react";


function Header() {
  const navigate = useNavigate();
  
const [printerConnected, setPrinterConnected] = useState(false);
const [printerName, setPrinterName] = useState(null);

useEffect(() => {
  // Check printer status every 3 seconds
  const interval = setInterval(() => {
    setPrinterConnected(isPrinterConnected());
    setPrinterName(getPrinterName());
  }, 3000);
  return () => clearInterval(interval);
}, []);

const handleConnectPrinter = async () => {
  try {
    await connectPrinter();
    setPrinterConnected(true);
    setPrinterName(getPrinterName());
  } catch (err) {
    alert("Could not connect to printer. Make sure Bluetooth is ON and printer is nearby.");
  }
};
  return (
    <header className="header">
      <div onClick={() => navigate("/Dashboard")} className="header-left">
        <img src={logo} alt="Gangadhar Provision Store" className="logo" />
      </div>

      <div onClick={() => navigate("/Dashboard")} className="header-center">
        <h2>Gangadhar Provision Store</h2>
        <p>Billing & Monthly Account System</p>
      </div>

      <div className="header-right">
        <span>Owner: Gangadhar</span>
      </div>
      <div style={{
        display: "flex", alignItems: "center",
        gap: "8px", fontSize: "12px"
      }}>
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          backgroundColor: printerConnected ? "#16a34a" : "#dc2626"
        }} />
        {printerConnected ? (
          <span style={{ color: "#16a34a" }}>
            🖨️ {printerName || "Printer"} Connected
          </span>
        ) : (
          <button
            onClick={handleConnectPrinter}
            style={{
              padding: "4px 10px", backgroundColor: "#1e3a5f",
              color: "white", border: "none", borderRadius: "6px",
              cursor: "pointer", fontSize: "12px"
            }}
          >
            🖨️ Connect Printer
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;