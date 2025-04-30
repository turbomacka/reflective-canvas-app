const OpenAI = require('openai');

/** @type {(req, res) => Promise<void>} */
module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const { first, second } = req.body;

  const prompt = `Du är en hjälpsam handledare. Jämför följande två svar och ge konkret feedback på förändringar i förståelse.

Första svar: """${first}"""

Andra svar: """${second}""" `;

 const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

 const completion = await openai.chat.completions.create({
   model: 'gpt-3.5-turbo-0125',   // garanterat tillgänglig
   messages: [{ role: 'user', content: prompt }],
   temperature: 0.7,
 });

 res.status(200).send(completion.choices[0].message.content);

};


*(Vi byter till `gpt-3.5-turbo-0125` så du slipper modell-åtkomstproblem om 4-serien inte är upplåst.)*

2. **Ta bort** den gamla TypeScript-filen (eller döp om den så den inte byggs):

```powershell
del api\feedback.ts
