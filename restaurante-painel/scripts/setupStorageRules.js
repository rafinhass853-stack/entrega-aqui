// Este script configura as regras de segurança do Storage
// Execute no Firebase Console > Storage > Rules

/*
Regras recomendadas para produção:

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Restaurantes podem acessar apenas seus próprios arquivos
    match /restaurants/{restaurantId}/{allPaths=**} {
      allow read: if request.auth != null && 
        request.auth.uid != null;
      allow write: if request.auth != null && 
        request.auth.uid != null &&
        request.resource.size < 5 * 1024 * 1024 && // 5MB max
        request.resource.contentType.matches('image/.*');
    }
    
    // Público pode ver imagens de produtos (para cardápio público)
    match /restaurants/{restaurantId}/products/{productId}/{imageName} {
      allow read: if true; // Qualquer um pode ver
      allow write: if request.auth != null && 
        request.auth.uid != null;
    }
  }
}
*/

console.log("📸 Configure as regras do Storage no Firebase Console:");
console.log("1. Vá em Storage > Rules");
console.log("2. Cole as regras acima");
console.log("3. Clique em Publicar");