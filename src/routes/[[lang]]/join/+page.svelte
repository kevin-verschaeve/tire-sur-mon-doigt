<script>
    let { data } = $props();

    const t = {
        fr: {
            title: 'Rejoindre un salon',
            description: 'Un salon permet de te synchroniser avec tes amis en temps réel. <br> Choisissez le même nom et tout le monde entendra le prout sur son appareil !',
            label: 'Nom du salon',
            placeholder: 'ex: bureau, famille…',
            submit: 'Rejoindre',
            activeRooms: 'Salons actifs',
            person: 'personne',
            people: 'personnes',
        },
        en: {
            title: 'Join a room',
            description: 'A room lets you sync with your friends in real time. <br> Pick the same name and everyone will hear the toots on their own device!',
            label: 'Room name',
            placeholder: 'e.g. office, family…',
            submit: 'Join',
            activeRooms: 'Active rooms',
            person: 'person',
            people: 'people',
        },
    }[data.lang];

    const homeHref = data.lang === 'fr' ? '/' : `/${data.lang}`;

    function joinHref(room) {
        return `${homeHref}?room=${encodeURIComponent(room)}`;
    }
</script>

<h2>{t.title}</h2>

<div class="content">
    <form action="/{data.lang}" method="GET" class="join-form">
        <label for="room-input">{t.label}</label>
        <div class="input-row">
            <input
                id="room-input"
                type="text"
                name="room"
                placeholder={t.placeholder}
                spellcheck="false"
                required
            />

            <button type="submit" class="button-fart">{t.submit}</button>
        </div>
        <p class="description">{@html t.description}</p>
    </form>

</div>

{#if data.rooms.length > 0}
    <div class="content">
        <div class="rooms-list">
            <h3>{t.activeRooms}</h3>
            <ul>
                {#each data.rooms as { room, count } (room)}
                    <li>
                        <a href={joinHref(room)} class="room-link">
                            <span class="room-name">{room}</span>
                            <span class="room-count">{count} {count > 1 ? t.people : t.person}</span>
                        </a>
                    </li>
                {/each}
            </ul>
        </div>
    </div>
{/if}


<style>
    .content {
        padding: 0 20px;
    }

    .description {
        color: #555;
    }

    .join-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 420px;
    }

    label {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        font-weight: 600;
        color: #555;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .input-row {
        display: flex;
        gap: 10px;
        align-items: stretch;
    }

    input[type="text"] {
        flex: 1;
        height: 48px;
        padding: 0 14px;
        font-family: "JetBrains Mono", monospace;
        font-size: 1em;
        color: #36395a;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 4px;
        box-shadow: rgba(45, 35, 66, 0.1) 0 2px 4px inset;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-sizing: border-box;
    }

    input[type="text"]::placeholder {
        color: #aaa;
    }

    input[type="text"]:focus {
        border-color: #36395a;
        box-shadow: rgba(45, 35, 66, 0.15) 0 2px 6px inset;
    }


    .rooms-list {
        width: 100%;
        max-width: 420px;
    }

    .rooms-list h3 {
        font-family: Helvetica, sans-serif;
        font-size: 0.85em;
        font-weight: 600;
        color: #555;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin: 0 0 10px;
    }

    .rooms-list ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .room-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        height: 48px;
        padding: 0 14px;
        font-family: "JetBrains Mono", monospace;
        color: #36395a;
        background: #fcfcfd;
        border: 1.5px solid #d6d6e7;
        border-radius: 4px;
        box-shadow: rgba(45, 35, 66, 0.1) 0 2px 4px inset;
        text-decoration: none;
        transition: border-color 0.15s, box-shadow 0.15s;
    }

    .room-link:hover {
        border-color: #36395a;
        box-shadow: rgba(45, 35, 66, 0.15) 0 2px 6px inset;
    }

    .room-name {
        font-weight: 600;
    }

    .room-count {
        font-size: 0.85em;
        color: #888;
    }

    @media (max-width: 480px) {
        .input-row {
            flex-direction: column;
        }

        input[type="text"] {
            flex: none;
            width: 100%;
        }

        .input-row :global(.button-fart) {
            width: 100%;
        }
    }
</style>
