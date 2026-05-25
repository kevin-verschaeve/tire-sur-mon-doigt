import { error } from '@sveltejs/kit';

const supported = ['fr', 'en'];

export function load({ params }) {
    const lang = params.lang || 'fr';
    if (!supported.includes(lang)) {
        error(404);
    }
    return { lang };
}
