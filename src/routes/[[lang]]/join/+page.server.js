export async function load({ fetch }) {
    const res = await fetch('/api/rooms');
    const rooms = res.ok ? await res.json() : [];
    return { rooms };
}
