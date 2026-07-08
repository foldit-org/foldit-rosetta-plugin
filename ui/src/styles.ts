// Shadow-scoped styles for the rama-map panel. The host-side reference file
// `RamaMapPanel.css` is authored in Tailwind `@apply` form, which only resolves
// through the host's PostCSS pipeline; injected raw into a shadow root it would
// be inert. These are the equivalent resolved declarations plus a concrete
// panel height so the shadow content lays out on its own.
export const PANEL_CSS = `
:host, .rama-host {
  display: block;
  box-sizing: border-box;
}
.rama-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 360px;
  padding: 8px;
  color: #e5e7eb;
  font: 12px/1.4 system-ui, sans-serif;
}
.rama-canvas {
  background: #f5f5f5;
  cursor: pointer;
  align-self: center;
  border-radius: 4px;
}
.rama-footer {
  position: relative;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 20px;
  margin-top: 8px;
  align-items: center;
  justify-content: space-between;
  color: #e5e7eb;
}
`;
