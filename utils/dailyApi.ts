export const getOrCreateDailyRoom = async (roomName: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_DAILY_API_KEY;
    if (!apiKey) throw new Error("Daily API key is missing. Verifique o arquivo .env.local.");

    // Regex para permitir limpesa do nome da sala caso contenha hifens e se enquadre no Daily
    const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);

    try {
        // 1. Tentar criar ruma sala nova com expiração de 24 horas
        const response = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                name: cleanRoomName,
                privacy: 'public',
                properties: {
                    exp: Math.floor(Date.now() / 1000) + 86400, // Expira em 24h
                },
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.url;
        }

        // 2. Se a sala já existir (código 400 Bad Request por duplicação), buscar ela
        if (response.status === 400) {
            const getResponse = await fetch(`https://api.daily.co/v1/rooms/${cleanRoomName}`, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                }
            });
            if (getResponse.ok) {
                const data = await getResponse.json();
                return data.url;
            }
        }

        throw new Error(`Failed to create Daily room: ${response.statusText}`);
    } catch (err) {
        console.error('Daily API Error:', err);
        throw err;
    }
};
