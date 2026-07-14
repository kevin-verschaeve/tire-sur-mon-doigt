import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const COOKIE = 'mod_auth';

function getPassword() {
    return env.MODERATION_PASSWORD || 'prout-admin';
}

export function load({ cookies }) {
    return { authed: cookies.get(COOKIE) === getPassword() };
}

export const actions = {
    login: async ({ cookies, request }) => {
        const form = await request.formData();
        const password = form.get('password');

        if (password !== getPassword()) {
            return fail(401, { error: true });
        }

        cookies.set(COOKIE, getPassword(), {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 8, // 8h
        });

        return { success: true };
    },

    logout: async ({ cookies }) => {
        cookies.delete(COOKIE, { path: '/' });
        return { success: true };
    },
};
