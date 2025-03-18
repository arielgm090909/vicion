import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { image2text, askAboutImage, messageHistory } from './scripts/gemini'
import "dotenv/config";
import { unlink } from 'fs/promises';




const PORT = process.env.PORT ?? 3009

import { welcomeFlow } from './flows/welcome.flow';
import { chat } from './scripts/gemini'




const imageFlow = addKeyword(EVENTS.MEDIA)
    .addAction(async (ctx, ctxFn) => {
        const userId = ctx.from;
        const localPath = await ctxFn.provider.saveFile(ctx, { path: './assets' });
        
        // Programar eliminación después de 1 minuto
        setTimeout(async () => {
            try {
                await unlink(localPath);
                messageHistory.removeLastImage(userId);
                console.log(`Imagen eliminada: ${localPath}`);
            } catch (error) {
                console.error('Error al eliminar imagen:', error);
            }
        }, 60000); // 60000 ms = 1 minuto

        const response = await image2text(
            "Describe detalladamente esta imagen", 
            localPath,
            userId
        );
        await ctxFn.flowDynamic([
            response,
            "Puedes hacerme preguntas específicas sobre esta imagen durante el próximo minuto."
        ]);
    });



const mainFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
    .addAction(async (ctx, ctxFn) => {
        const bodyText: string = ctx.body.toLowerCase();
        const userId = ctx.from;

        // Verificar comando de reinicio
        if (bodyText === '/reiniciar' || bodyText === '/reset') {
            messageHistory.resetUserChat(userId);
            return await ctxFn.flowDynamic('Chat reiniciado. ¿En qué puedo ayudarte?');
        }

        //Primero, el usuario esta saludando?
        const keywords: string[] = ["hola", "buenas", "ola"];
        const containsKeyword: boolean = keywords.some(keyword => bodyText.includes(keyword));
        if (containsKeyword) {
            return await ctxFn.gotoFlow(welcomeFlow); //Si, esta saludando, delegar al welcome flow
        } //No, no esta saludando

        // Verificar si es una pregunta sobre la imagen
        const imageQuestionIndicators = ["en la imagen", "en la foto", "de la imagen", "de la foto"];
        if (imageQuestionIndicators.some(indicator => bodyText.includes(indicator))) {
            const response = await askAboutImage(userId, ctx.body);
            return await ctxFn.flowDynamic(response);
        }

        //Entonces habla con una AI!
        const prompt = "Sos asistente en WhatsApp";
        const text = ctx.body;
        const response = await chat(prompt, text, userId);
        await ctxFn.flowDynamic(response);
    })


const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, mainFlow, imageFlow])

    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
