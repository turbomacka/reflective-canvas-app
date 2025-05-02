// src/components/ui/spinner.tsx
export function Spinner({ size = 40 }: { size?: number }) {
    const s = `${size}px`;
    return (
      <div
        className="animate-spin rounded-full border-t-4 border-gray-200 border-b-4 border-[#005eb8]"
        style={{ width: s, height: s }}
      />
    );
  }
  