// Short messages at the top of the page. Messages without buttons close after
// 4 seconds; with buttons, they stay until one is clicked.
let timer = null;

export const showNotice = (message, actions = []) => {
    const notice = document.querySelector('#notice');
    clearTimeout(timer);
    const text = document.createElement('span');
    text.textContent = message;
    const buttons = actions.map(({ label, onClick }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => {
            notice.hidden = true;
            onClick();
        });
        return button;
    });
    notice.replaceChildren(text, ...buttons);
    notice.hidden = false;
    if (actions.length === 0) {
        timer = setTimeout(() => {
            notice.hidden = true;
        }, 4000);
    }
};
