import {useState} from "react";
// @ts-ignore - types don't exist
import HasuraGraphiQL from "@hasura/public-graphiql";
import {getPresets} from "./utils";

function App() {
  const {defaultHeaders, defaultQuery, defaultUrl, defaultVariables} =
    getPresets();
  const [endpoint, setEndpoint] = useState(defaultUrl);

  if (endpoint.length) {
    return (
      <>
        <div className="graphiql-holder">
          <HasuraGraphiQL
            url={endpoint}
            defaultHeaders={defaultHeaders}
            defaultQuery={defaultQuery}
            defaultVariables={defaultVariables}
            isCloud={false}
            customToolbar={
              <button
                onClick={() => setEndpoint("")}
                className="change-endpoint-button"
              >
                Change Endpoint
              </button>
            }
          />
        </div>
      </>
    );
  } else return null;
}

export default App;
