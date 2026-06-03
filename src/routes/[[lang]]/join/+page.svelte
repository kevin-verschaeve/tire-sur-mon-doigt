<script>
    let { data } = $props();

    const t = {
        fr: {
            title: 'Rejoindre un salon',
            description: 'Un salon permet de te synchroniser avec tes amis en temps réel. <br> Choisissez le même nom et tout le monde entendra le prout sur son appareil !',
            label: 'Nom du salon',
            placeholder: 'ex: bureau, famille…',
            submit: 'Rejoindre',
        },
        en: {
            title: 'Join a room',
            description: 'A room lets you sync with your friends in real time. <br> Pick the same name and everyone will hear the toots on their own device!',
            label: 'Room name',
            placeholder: 'e.g. office, family…',
            submit: 'Join',
        },
    }[data.lang];
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

<div id="container-781deaaa368b7b945bbc2df24b7dee54" class="ads-native-banner ads-banner-width"></div>


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
