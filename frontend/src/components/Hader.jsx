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
        <img src={logo} alt="SystemNirmata" className="logo" />
      </div>

      <div className="printer-status">
        <div
          className={`printer-dot ${printerConnected ? "connected" : "disconnected"}`}
        />
        {printerConnected ? (
          <span className="printer-connected-label">
            🖨️ {printerName || "Printer"} Connected
          </span>
        ) : (
          <button onClick={handleConnectPrinter} className="printer-connect-btn">
            🖨️ Connect Printer
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;