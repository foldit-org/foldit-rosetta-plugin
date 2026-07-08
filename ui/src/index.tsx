import { render } from 'solid-js/web';
import type { MountPanel } from '@foldit/plugin-bridge';
import { RamaMapPanel } from './RamaMapPanel';
import { PANEL_CSS } from './styles';

export { BRIDGE_CONTRACT_VERSION } from '@foldit/plugin-bridge';

export const mountPanel: MountPanel = (panelId, shadow, bridge) => {
  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  shadow.appendChild(style);

  // Render into an explicitly-sized container rather than the bare shadow root
  // so the panel content has a layout box of its own.
  const container = document.createElement('div');
  container.className = 'rama-host';
  shadow.appendChild(container);

  const dispose = render(() => <RamaMapPanel panelId={panelId} bridge={bridge} />, container);

  return () => {
    dispose();
    shadow.replaceChildren();
  };
};
