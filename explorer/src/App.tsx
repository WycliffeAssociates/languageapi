import {useState} from "react";
// @ts-ignore - types don't exist
import HasuraGraphiQL from "@hasura/public-graphiql";
import {getPresets} from "./utils";

function App() {
  const {defaultHeaders, defaultQuery, defaultUrl, defaultVariables} =
    getPresets();

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
