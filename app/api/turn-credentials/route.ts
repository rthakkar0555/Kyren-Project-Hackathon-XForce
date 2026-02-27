
import { NextResponse } from 'next/server';
import twilio from 'twilio';

// NOTE: These should ideally be environment variables
// For this task, you might need to ask the user to provide them or use a free STUN/TURN list if they don't have Twilio.
// However, since the user is likely on a restricted network (different wifi/laptops), a TURN server is almost certainly needed.

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export async function GET() {
    if (!accountSid || !authToken) {
        // Fallback to free public ICE servers if no Twilio credentials
        // Note: Public STUN servers are already in the frontend code, but adding them here for consistency 
        // or if we switch strictly to server-side generation.
        // BUT without a TURN server, peer-to-peer across different NATs is very likely to fail.
        return NextResponse.json({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:stun.ekiga.net' },
                { urls: 'stun:stun.ideasip.com' },
                { urls: 'stun:stun.schlund.de' },
                { urls: 'stun:stun.voiparound.com' },
                { urls: 'stun:stun.voipbuster.com' },
                { urls: 'stun:stun.voipstunt.com' },
                { urls: 'stun:stun.voxgratia.org' }
            ]
        });
    }

    const client = twilio(accountSid, authToken);

    try {
        const token = await client.tokens.create();

        return NextResponse.json({
            iceServers: token.iceServers
        });
    } catch (error) {
        console.error('Error fetching TURN credentials:', error);
        return NextResponse.json({ error: 'Failed to fetch TURN credentials' }, { status: 500 });
    }
}
