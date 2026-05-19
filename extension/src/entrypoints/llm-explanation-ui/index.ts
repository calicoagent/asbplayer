import { renderLlmExplanationUi } from '@/ui/llm-explanation';
import FrameBridgeServer from '@/services/frame-bridge-server';

export default defineUnlistedScript(() => {
    window.addEventListener('load', () => {
        const root = document.getElementById('root')!;
        const loc = JSON.parse(document.getElementById('loc')!.innerHTML!);
        const bridge = renderLlmExplanationUi(root, loc.lang, loc.strings);
        const listener = new FrameBridgeServer(bridge);
        listener.bind();

        window.addEventListener('unload', () => {
            listener.unbind();
        });
    });
});
