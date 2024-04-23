// @ts-ignore - types don't exist
import HasuraGraphiQL from "@hasura/public-graphiql";
import {getPresets} from "./utils";
import {Docs} from "./Docs";

function App() {
  const {defaultHeaders, defaultQuery, defaultUrl, defaultVariables} =
    getPresets();
  if (window.location.pathname === "/examples") {
    return <Docs />;
  }

  if (defaultUrl.length) {
    return (
      <>
        <div className="graphiql-holder">
          <HasuraGraphiQL
            url={defaultUrl}
            defaultHeaders={defaultHeaders}
            defaultQuery={defaultQuery}
            defaultVariables={defaultVariables}
            isCloud={false}
          />
        </div>
      </>
    );
  } else return null;
}

export default App;
