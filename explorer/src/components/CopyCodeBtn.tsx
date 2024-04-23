import {useState} from "react";

export function CopyCodeBtn(props: {code: string}) {
  const [didCopy, setDidCopy] = useState(false);

  return (
    <button
      className={"docs-code-block-copy-btn"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(props.code);
          setDidCopy(true);
          setTimeout(() => setDidCopy(false), 2000);
          console.log("copied");
        } catch (e) {
          console.error(e);
        }
      }}
    >
      {didCopy ? "Copied!" : "Copy"}
    </button>
  );
}
