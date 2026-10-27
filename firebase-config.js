// Proyectos de Firebase que puede usar el panel (Authentication + Firestore).
// El panel usa FIREBASE_PREDETERMINADO. Para probar el otro sin afectar el uso diario, abre la página con
//   ?proyecto=nuevo   o   ?proyecto=anterior
// Estos valores no son secretos: Firebase los publica en la consola (Configuración del proyecto > Tus apps).
const FIREBASE_PROYECTOS = {
    anterior: {
        apiKey:            "AIzaSyBpiExYjeKjE316Ls0H-X1ybGyw8PLCF1o",
        authDomain:        "the-spot-a7cd1.firebaseapp.com",
        projectId:         "the-spot-a7cd1",
        storageBucket:     "the-spot-a7cd1.firebasestorage.app",
        messagingSenderId: "131741958215",
        appId:             "1:131741958215:web:1cfa2d73a0ec9fd243f162"
    },
    nuevo: {
        apiKey:            "AIzaSyALB-pQkE_Y0VBD7tqO1YC5C5X1vtz9Lic",
        authDomain:        "spot-club-inventario.firebaseapp.com",
        projectId:         "spot-club-inventario",
        storageBucket:     "spot-club-inventario.firebasestorage.app",
        messagingSenderId: "89313528113",
        appId:             "1:89313528113:web:39d4251ddd7140d7060810"
    }
};
const FIREBASE_PREDETERMINADO = 'anterior';   // cambiar a 'nuevo' cuando el proyecto nuevo esté listo
const _pedido = new URLSearchParams(location.search).get('proyecto');
const FIREBASE_USANDO = FIREBASE_PROYECTOS[_pedido] ? _pedido : FIREBASE_PREDETERMINADO;
const FIREBASE_MANUAL = !!FIREBASE_PROYECTOS[_pedido];   // true si se eligió con ?proyecto=
const firebaseConfig = FIREBASE_PROYECTOS[FIREBASE_USANDO];
