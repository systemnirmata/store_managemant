const ESC = 0x1B;
const GS = 0x1D;

let printerCharacteristic = null;
let printerDevice = null;

// ── CONNECT PRINTER ──────────────────────────────────────────
export async function connectPrinter() {
    try {
        // Request device from user
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

        // Save device name for reconnect
        sessionStorage.setItem("printerName", device.name || "Printer");

        // Listen for disconnect
        device.addEventListener('gattserverdisconnected', () => {
            printerCharacteristic = null;
            console.log("Printer disconnected");
            // Auto reconnect
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
        await new Promise(r => setTimeout(r, 1000)); // wait 1 second
        printerCharacteristic = await getCharacteristic(printerDevice);
        console.log("Printer reconnected!");
    } catch (err) {
        console.log("Auto reconnect failed:", err);
        // Try again after 3 seconds
        setTimeout(autoReconnect, 3000);
    }
}

// ── CHECK IF CONNECTED ───────────────────────────────────────
export function isPrinterConnected() {
    return printerCharacteristic !== null &&
        printerDevice ? .gatt ? .connected === true;
}

// ── GET PRINTER STATUS ───────────────────────────────────────
export function getPrinterName() {
    return sessionStorage.getItem("printerName") || null;
}

// ── DISCONNECT PRINTER ───────────────────────────────────────
export function disconnectPrinter() {
    if (printerDevice ? .gatt ? .connected) {
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
    lines.push(new Uint8Array([ESC, 0x61, 0x01])); // center

    lines.push(new Uint8Array([ESC, 0x21, 0x30])); // large bold
    lines.push(encoder.encode("GANGADHAR PROVISION\n"));
    lines.push(encoder.encode("STORE\n"));

    lines.push(new Uint8Array([ESC, 0x21, 0x00])); // normal
    lines.push(encoder.encode("Bhavnagar, Gujarat - 364001\n"));
    lines.push(encoder.encode("Ph: 95860 52965\n"));
    lines.push(encoder.encode("GSTIN: 24ADHPP9881D1Z9\n"));
    lines.push(encoder.encode("--------------------------------\n"));

    lines.push(new Uint8Array([ESC, 0x61, 0x00])); // left
    lines.push(encoder.encode(`Bill No : #${bill.bid}\n`));
    lines.push(encoder.encode(`Date    : ${new Date(bill.created_at).toLocaleDateString("en-IN")}\n`));
    lines.push(encoder.encode(`Customer: ${bill.cname}\n`));
    lines.push(encoder.encode(`Phone   : ${bill.phone || "-"}\n`));
    lines.push(encoder.encode(`Payment : ${bill.paymentType}\n`));
    lines.push(encoder.encode("--------------------------------\n"));

    lines.push(new Uint8Array([ESC, 0x21, 0x08])); // bold
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

    lines.push(new Uint8Array([ESC, 0x61, 0x01])); // center
    lines.push(encoder.encode("Thank You! Visit Again\n"));
    lines.push(new Uint8Array([ESC, 0x64, 0x05])); // feed 5 lines
    lines.push(new Uint8Array([GS, 0x56, 0x41, 0x10])); // cut

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
        // If not connected, connect first
        if (!isPrinterConnected()) {
            await connectPrinter();
        }

        const data = createReceiptData(bill);
        const chunkSize = 512;

        for (let i = 0; i < data.length; i += chunkSize) {
            await printerCharacteristic.writeValue(data.slice(i, i + chunkSize));
        }

        return { success: true };
    } catch (err) {
        console.error("Print failed:", err);
        throw err;
    }
}