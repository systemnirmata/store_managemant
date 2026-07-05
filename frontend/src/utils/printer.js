const ESC = 0x1B;
const GS = 0x1D;

let printerCharacteristic = null;
let printerDevice = null;

// ── CONNECT PRINTER ──────────────────────────────────────────
export async function connectPrinter() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
                { namePrefix: 'HOP' },
                { namePrefix: 'POS' },
                { namePrefix: 'Printer' },
            ],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        printerDevice = device;
        sessionStorage.setItem("printerName", device.name || "Printer");

        device.addEventListener('gattserverdisconnected', () => {
            printerCharacteristic = null;
            console.log("Printer disconnected");
            autoReconnect();
        });

        printerCharacteristic = await getCharacteristic(device);
        return printerCharacteristic;

    } catch (err) {
        console.error("Bluetooth connection failed:", err);
        throw err;
    }
}

// ── GET CHARACTERISTIC ───────────────────────────────────────
async function getCharacteristic(device) {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(
        '000018f0-0000-1000-8000-00805f9b34fb'
    );
    const characteristic = await service.getCharacteristic(
        '00002af1-0000-1000-8000-00805f9b34fb'
    );
    return characteristic;
}

// ── AUTO RECONNECT ───────────────────────────────────────────
async function autoReconnect() {
    if (!printerDevice) return;
    try {
        console.log("Reconnecting to printer...");
        await new Promise(r => setTimeout(r, 1000));
        printerCharacteristic = await getCharacteristic(printerDevice);
        console.log("Printer reconnected!");
    } catch (err) {
        console.log("Auto reconnect failed:", err);
        setTimeout(autoReconnect, 3000);
    }
}

// ── RECONNECT PRINTER (called on page load) ──────────────────
export async function reconnectPrinter() {
    try {
        if (!navigator.bluetooth) return false;

        const devices = await navigator.bluetooth.getDevices();
        if (devices.length === 0) return false;

        const device = devices[0];
        printerDevice = device;

        device.addEventListener('gattserverdisconnected', () => {
            printerCharacteristic = null;
            autoReconnect();
        });

        printerCharacteristic = await getCharacteristic(device);
        sessionStorage.setItem("printerName", device.name || "Printer");
        console.log("✅ Printer auto reconnected!");
        return true;
    } catch (err) {
        console.log("Auto reconnect failed:", err);
        return false;
    }
}

// ── CHECK IF CONNECTED ───────────────────────────────────────
export function isPrinterConnected() {
    return printerCharacteristic !== null &&
        printerDevice != null &&
        printerDevice.gatt != null &&
        printerDevice.gatt.connected === true;
}

// ── GET PRINTER NAME ─────────────────────────────────────────
export function getPrinterName() {
    return sessionStorage.getItem("printerName") || null;
}

// ── DISCONNECT PRINTER ───────────────────────────────────────
export function disconnectPrinter() {
    if (printerDevice != null &&
        printerDevice.gatt != null &&
        printerDevice.gatt.connected) {
        printerDevice.gatt.disconnect();
    }
    printerCharacteristic = null;
    printerDevice = null;
    sessionStorage.removeItem("printerName");
}

// ── CREATE RECEIPT DATA ──────────────────────────────────────
export function createReceiptData(bill) {
    const encoder = new TextEncoder();
    const lines = [];

    lines.push(new Uint8Array([ESC, 0x40]));
    lines.push(new Uint8Array([ESC, 0x61, 0x01]));
    lines.push(new Uint8Array([ESC, 0x21, 0x30]));
    lines.push(encoder.encode("GANGADHAR PROVISION\n"));
    lines.push(encoder.encode("STORE\n"));
    lines.push(new Uint8Array([ESC, 0x21, 0x00]));
    lines.push(encoder.encode("Bhavnagar, Gujarat - 364001\n"));
    lines.push(encoder.encode("Ph: 95860 52965\n"));
    lines.push(encoder.encode("GSTIN: 24ADHPP9881D1Z9\n"));
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push(new Uint8Array([ESC, 0x61, 0x00]));
    lines.push(encoder.encode(`Bill No : #${bill.bid}\n`));
    lines.push(encoder.encode(`Date    : ${new Date(bill.created_at).toLocaleDateString("en-IN")}\n`));
    lines.push(encoder.encode(`Customer: ${bill.cname}\n`));
    lines.push(encoder.encode(`Phone   : ${bill.phone || "-"}\n`));
    lines.push(encoder.encode(`Payment : ${bill.paymentType}\n`));
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push(new Uint8Array([ESC, 0x21, 0x08]));
    lines.push(encoder.encode("Item            Qty    Amount\n"));
    lines.push(new Uint8Array([ESC, 0x21, 0x00]));
    lines.push(encoder.encode("--------------------------------\n"));

    bill.items.forEach(item => {
        const name = item.product_name.substring(0, 14).padEnd(14);
        const qty = String(item.quantity).padStart(3);
        const amount = `Rs.${item.subtotal.toFixed(2)}`.padStart(9);
        lines.push(encoder.encode(`${name} ${qty} ${amount}\n`));
    });

    lines.push(encoder.encode("--------------------------------\n"));
    lines.push(new Uint8Array([ESC, 0x21, 0x08]));
    lines.push(encoder.encode(
        `TOTAL: Rs.${parseFloat(bill.total_amount).toFixed(2)}\n`
    ));
    lines.push(new Uint8Array([ESC, 0x21, 0x00]));
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push(new Uint8Array([ESC, 0x61, 0x01]));
    lines.push(encoder.encode("Thank You! Visit Again\n"));
    lines.push(new Uint8Array([ESC, 0x64, 0x05]));
    lines.push(new Uint8Array([GS, 0x56, 0x41, 0x10]));

    const totalLength = lines.reduce((sum, l) => sum + l.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    lines.forEach(l => {
        result.set(l, offset);
        offset += l.length;
    });
    return result;
}

// ── PRINT BILL ───────────────────────────────────────────────
export async function printBill(bill) {
    try {
        if (!isPrinterConnected()) {
            await connectPrinter();
        }

        const data = createReceiptData(bill);
        const chunkSize = 512;

        for (let i = 0; i < data.length; i += chunkSize) {
            await printerCharacteristic.writeValue(data.slice(i, i + chunkSize));
            await new Promise(r => setTimeout(r, 50));
        }

        return { success: true };
    } catch (err) {
        console.error("Print failed:", err);
        throw err;
    }
}