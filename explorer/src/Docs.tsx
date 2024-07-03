import {useEffect, useState} from "react";
import {getHighlighter, type Highlighter} from "shiki";
import {CopyCodeBtn} from "./components/CopyCodeBtn";

export function Docs() {
  const [highlighter, setHighlighter] = useState<Highlighter | undefined>();

  const examples = [
    {
      slug: "all-langs",
      title: "All Languages",
      code: `query MyQuery {
        language {
          id
          ietf_code
          is_oral_language
          iso6393
          national_name
        }
      }`,
      notes: null,
    },
  ];

  useEffect(() => {
    async function initShiki() {
      const highlighter = await getHighlighter({
        themes: ["github-light-default"],
        langs: ["graphql"],
      });
      setHighlighter(highlighter);
    }
    initShiki();
  }, []);
  if (!highlighter) return <div>Loading...</div>;

  return (
    <div style={{padding: "1rem", maxWidth: "1200px", margin: "0 auto"}}>
      <h1>Wa Language Api</h1>
      <p>
        The <a href="/">Explorer itself </a> is the easiest way to get started
        to see all possible fields and relations. However, this page will give a
        quick level overview of some possible common queries that one might
        want.{" "}
      </p>
      <div>
        <p>Table of contents</p>
        <ul>
          {examples.map((example) => (
            <li>
              <a href={`#${example.slug}`}>{example.title}</a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        {examples.map((example) => (
          <div className="docs-code-bloc" id={example.slug}>
            <h1>{example.title}</h1>
            {example.notes && <p>{example.notes}</p>}
            <div className="relative docs-code-container ">
              <CopyCodeBtn code={example.code} />
              <div
                className="docs-code-block"
                dangerouslySetInnerHTML={{
                  __html: highlighter.codeToHtml(example.code, {
                    lang: "graphql",
                    theme: "github-light-default",
                  }),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
