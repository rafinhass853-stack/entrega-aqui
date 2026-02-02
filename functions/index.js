const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// ✅ checa se usuário é admin (você pode mudar a regra aqui)
async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Faça login para continuar.");
  }

  const uid = context.auth.uid;

  // Exemplo de verificação: coleção admins/{uid} com campo ativo:true
  const snap = await admin.firestore().doc(`admins/${uid}`).get();
  const isAdmin = snap.exists && snap.data()?.ativo === true;

  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Acesso negado (somente admin).");
  }

  return uid;
}

// ✅ Pegar dados do Authentication (criação e último login)
exports.getAuthInfo = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const targetUid = String(data?.uid || "").trim();
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "UID é obrigatório.");
  }

  try {
    const userRecord = await admin.auth().getUser(targetUid);

    return {
      uid: userRecord.uid,
      email: userRecord.email || null,
      disabled: !!userRecord.disabled,
      creationTime: userRecord.metadata?.creationTime || null,
      lastSignInTime: userRecord.metadata?.lastSignInTime || null,
      providerData: (userRecord.providerData || []).map((p) => ({
        providerId: p.providerId,
        uid: p.uid,
        email: p.email || null
      }))
    };
  } catch (e) {
    console.error("getAuthInfo error:", e);
    throw new functions.https.HttpsError("not-found", "Usuário não encontrado no Authentication.");
  }
});

// ✅ Admin definir senha do usuário (sem e-mail)
exports.setUserPassword = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const targetUid = String(data?.uid || "").trim();
  const newPassword = String(data?.newPassword || "");

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "UID é obrigatório.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Senha deve ter no mínimo 6 caracteres.");
  }

  try {
    await admin.auth().updateUser(targetUid, { password: newPassword });
    return { ok: true };
  } catch (e) {
    console.error("setUserPassword error:", e);
    throw new functions.https.HttpsError("internal", "Erro ao definir senha.");
  }
});
exports.setUserDisabled = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);

  const targetUid = String(data?.uid || "").trim();
  const disabled = !!data?.disabled;

  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "UID é obrigatório.");
  }

  try {
    await admin.auth().updateUser(targetUid, { disabled });
    return { ok: true, disabled };
  } catch (e) {
    console.error("setUserDisabled error:", e);
    throw new functions.https.HttpsError("internal", "Erro ao bloquear/desbloquear usuário.");
  }
});
