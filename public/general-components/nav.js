export const navbar = ()=>{
return `
<nav
        class=" sticky top-0 z-50 bg-sky-600 p-4 flex flex-col sm:flex-row items-center justify-between mb-2 w-full top-0 z-50 shadow-lg gap-4">

        <div class="text-center">
            <p class="text-6xl font-extrabold sm:text-4xl font-bold">
                Velonet
            </p>
        </div>


        <div
            class="flex items-center space-x-4 sm:flex-row sm:flex flex-space-x-4 items-center w-full sm:w-auto space-y-0 sm:space-y-0 ">
            
            <a href="/pages/index.html" class="rounded-2xl font-bold text-lg p-2 px-4 hover:bg-sky-700 transition-all" id="btnHome">
                Inicio
            </a>
            
            <a href="/pages/history/index.html" class="rounded-2xl font-bold text-lg p-2 px-4 hover:bg-sky-700 transition-all" id="btnHistory">
                Historial
            </a>
            
            <a href="/pages/clients/index.html" class="rounded-2xl font-bold text-lg p-2 px-4 hover:bg-sky-700 transition-all" id="btnClients">
                Clientes
            </a>
            
            <button id="profile" class="px-4">
                <img src="../../general-assets/profile.png" alt="Profile"
                    class="h-12 w-10 m:h-12 sm:w-12 rounded-full hover:bg-sky-700 transition-all">
            </button>
        </div>
    </nav>

`};


