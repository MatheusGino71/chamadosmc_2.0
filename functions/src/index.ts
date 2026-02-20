/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Inicializa o Firebase Admin
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

/**
 * Cloud Function para resetar senha de um usuário para "123456"
 * Apenas administradores podem chamar essa função
 */
export const resetUserPassword = onCall(async (request) => {
  // Verifica se o usuário está autenticado
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado");
  }

  // Busca o documento do usuário que está fazendo a requisição
  const callerDoc = await admin.firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  // Verifica se o usuário é admin
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem resetar senhas"
    );
  }

  const {uid} = request.data;

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID do usuário é obrigatório");
  }

  try {
    // Reseta a senha do usuário para "123456"
    await admin.auth().updateUser(uid, {
      password: "123456",
    });

    logger.info(`Senha resetada para usuário ${uid} por ${request.auth.uid}`);

    return {
      success: true,
      message: "Senha resetada com sucesso para 123456",
    };
  } catch (error: any) {
    logger.error("Erro ao resetar senha:", error);
    throw new HttpsError("internal", `Erro ao resetar senha: ${error.message}`);
  }
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
