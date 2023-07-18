// You can use this file to test out things or check the db without running the azure function. Just npx (or equivalent) ts-node ./src/db/utils/scratch.ts.   It will compile and run.
import * as schema from "../schema/schema";
import {
  polymorphicDelete,
  polymorphicInsert,
  polymorphicSelect,
  polymorphicUpdate,
} from "../handlers";

async function testContent() {
  try {
    const result = await polymorphicInsert({
      tableKey: "content",
      content: [
        {
          createdOn: "2017-01-20T20:32:30Z",
          domain: "scripture",
          id: "carnicero-gl_mrk_text_reg",
          languageId: "gl",
          meta: {
            showOnBiel: false,
            status: "Active",
          },
          modifiedOn: "2023-06-29T18:11:06Z",
          namespace: "WACS",
          resourceType: "reg",
          type: "text",
        },
      ],
    });
    console.log(result);
    return result;
  } catch (error) {
    console.error({error});
    return error;
  }
}
async function seedRegionsTable() {
  try {
    const result = await polymorphicInsert({
      tableKey: "worldRegion",
      content: [
        {
          invalid: "invalid",
        },
      ],
    });
    console.log(result);
  } catch (error) {
    console.error({error});
  }
}
async function checkTable() {
  const result = await polymorphicSelect("countryToLanguage");
  const result2 = await polymorphicSelect("langAltNames");
  console.log(result);
  console.log(result2);
  process.exit();
}
async function awaitWrapper() {
  // debugger;
  // const results = await testContent();
  // console.log({results});
  checkTable();
}
awaitWrapper();
