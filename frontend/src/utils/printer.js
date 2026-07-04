const ESC = 0x1B;
const GS = 0x1D;

let savedDevice = null;
let savedCharacteristic = null;

// ── Auto reconnect on page load ──
export async function reconnectPrinter() {
    try {
        // Get previously paired devices
        const devices = await navigator.bluetooth.getDevices();

        if (devices.length === 0) return false;

        // Try to reconnect to first device
        const device = devices[0];

        device.addEventListener('gattserverdisconnected', () => {
            savedDevice = null;
            savedCharacteristic = null;
            autoReconnect(device);
        });

        await device.gatt.connect();
        const service = await device.gatt.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        savedDevice = device;
        savedCharacteristic = characteristic;

        console.log("✅ Printer auto reconnected!");
        return true;
    } catch (err) {
        console.log("Auto reconnect failed:", err);
        return false;
    }
}

// ── Auto reconnect when disconnected ──
async function autoReconnect(device) {
    let tries = 0;
    while (tries < 5) {
        try {
            await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds
            await device.gatt.connect();
            console.log("✅ Reconnected after disconnect!");
            return;
        } catch {
            tries++;
            console.log(`Reconnect attempt ${tries} failed...`);
        }
    }
}

// ── Main print function ──
export async function printBill(bill) {
    try {
        // Try existing connection first
        if (savedDevice && savedDevice.gatt.connected) {
            const data = createReceiptData(bill);
            await sendData(savedCharacteristic, data);
            return { success: true };
        }

        // Try auto reconnect first
        const reconnected = await reconnectPrinter();
        if (reconnected) {
            const data = createReceiptData(bill);
            await sendData(savedCharacteristic, data);
            return { success: true };
        }

        // Ask user to select device
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        device.addEventListener('gattserverdisconnected', () => {
            savedDevice = null;
            savedCharacteristic = null;
            autoReconnect(device);
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        savedDevice = device;
        savedCharacteristic = characteristic;

        const data = createReceiptData(bill);
        await sendData(characteristic, data);

        return { success: true };
    } catch (err) {
        console.error("Print failed:", err);
        throw err;
    }
}

async function sendData(characteristic, data) {
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        await new Promise(r => setTimeout(r, 50));
    }
}

function createReceiptData(bill) {
    const encoder = new TextEncoder();
    const lines = [];

    lines.push([ESC, 0x40]);
    lines.push([ESC, 0x61, 0x01]);
    lines.push([ESC, 0x21, 0x30]);
    lines.push(encoder.encode("GANGADHAR PROVISION\n"));
    lines.push(encoder.encode("STORE\n"));
    lines.push([ESC, 0x21, 0x00]);
    lines.push(encoder.encode("Bhavnagar, Gujarat - 364001\n"));
    lines.push(encoder.encode("Ph: 95860 52965\n"));
    lines.push(encoder.encode("GSTIN: 24ADHPP9881D1Z9\n"));
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push([ESC, 0x61, 0x00]);
    lines.push(encoder.encode(`Bill No : #${bill.bid}\n`));
    lines.push(encoder.encode(`Date    : ${new Date(bill.created_at).toLocaleDateString("en-IN")}\n`));
    lines.push(encoder.encode(`Customer: ${bill.cname}\n`));
    lines.push(encoder.encode(`Phone   : ${bill.phone || "-"}\n`));
    lines.push(encoder.encode(`Payment : ${bill.paymentType}\n`));
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push([ESC, 0x21, 0x08]);
    lines.push(encoder.encode("Item            Qty    Amount\n"));
    lines.push([ESC, 0x21, 0x00]);
    lines.push(encoder.encode("--------------------------------\n"));

    bill.items.forEach(item => {
        const name = item.product_name.substring(0, 14).padEnd(14);
        const qty = String(item.quantity).padStart(3);
        const amount = `Rs.${item.subtotal.toFixed(2)}`.padStart(9);
        lines.push(encoder.encode(`${name} ${qty} ${amount}\n`));
    });

    lines.push(encoder.encode("--------------------------------\n"));
    lines.push([ESC, 0x21, 0x08]);
    lines.push(encoder.encode(`TOTAL: Rs.${parseFloat(bill.total_amount).toFixed(2)}\n`));
    lines.push([ESC, 0x21, 0x00]);
    lines.push(encoder.encode("--------------------------------\n"));
    lines.push([ESC, 0x61, 0x01]);
    lines.push(encoder.encode("Thank You! Visit Again\n"));
    lines.push(encoder.encode("Powered by Smart Shop\n"));
    lines.push([ESC, 0x64, 0x05]);
    lines.push([GS, 0x56, 0x41, 0x10]);

    const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    lines.forEach(line => {
        result.set(line, offset);
        offset += line.length;
    });
    return result;
}