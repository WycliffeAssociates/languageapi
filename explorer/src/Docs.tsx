import {useEffect, useState} from "react";
import {getHighlighter, type Highlighter} from "shiki";
import {CopyCodeBtn} from "./components/CopyCodeBtn";
import entities from "./docsExamples/entities";
import examples from "./docsExamples/examples";
import "./uno_gen.css";
export function Docs() {
  const [highlighter, setHighlighter] = useState<Highlighter | undefined>();

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
    <div className="px-4 max-w-[1200px] mx-auto">
      <div className="">
        <h1 className="m-0 text-lg">Wa Language Api</h1>
        <p>
          The <a href="/">Explorer itself </a> is the easiest way to get started
          to see all possible fields and relations. However, this page will give
          a quick level overview of some possible common queries that one might
          want as well as some high level descriptions entities represented by
          each table. If you don't see something you thing should be here or are
          confused, please feel free to reach out and let us know.
        </p>
      </div>
      <div className="relative max-h-[calc(100vh-6rem)] overflow-auto gap-2 flex">
        <section className="sticky top-0 bg-gray-200 bottom-0 w-1/4 hidden md:block">
          <ul className="list-none p-0 flex flex-col gap-2 overflow-y-auto">
            <h2 className="text-lg m-0">Entities</h2>
            {entities.map((entity) => (
              <li className="pl-2">
                <a href={`#${entity.slug}`}>{entity.title}</a>
              </li>
            ))}
            <h2 className="text-lg m-0 mt-4">Examples</h2>
            {examples.map((example) => (
              <li className="pl-2">
                <a href={`#${example.slug}`}>{example.title}</a>
              </li>
            ))}
          </ul>
        </section>
        <section className="pb-100 w-3/4">
          {entities.map((entity) => (
            <div>
              <h2 id={entity.slug}>{entity.title}</h2>
              <p dangerouslySetInnerHTML={{__html: entity.bodyHtml}} />
            </div>
          ))}

          <div className="w-full border-t border-t-solid">
            <h2>EXAMPLES</h2>
            <p>
              You don't necessarily need all the fields in the following
              example. Some are just exemplary for stuff you might want to query
            </p>
          </div>
          {examples.map((example) => (
            <div
              className="docs-code-bloc w-full border-b border-b-solid border-b-gray-800 py-2"
              id={example.slug}
            >
              <h1>{example.title}</h1>
              {example.notes && <p>Note: {example.notes}</p>}
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
                {example.link && (
                  <a className="hover:text-yellow-700" href={example.link}>
                    Open in Explorer
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
