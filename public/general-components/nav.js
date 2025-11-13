export const navbar = ()=>{
return `
<nav
        class="bg-sky-600 p-4 flex flex-col sm:flex-row items-center justify-between mb-2 w-full top-0 z-50 shadow-lg gap-4">

        <div class="text-center">
            <p class="text-2xl sm:text-4xl font-bold">
                Velonet
            </p>
        </div>


        <div
            class="flex items-center space-x-4 sm:flex-row sm:flex flex-space-x-4 items-center w-full sm:w-auto space-y-0 sm:space-y-0 ">
            
            <a href="../home/index.html" class="rounded-2xl p-2 px-4 hover:bg-sky-700 transition-all" id="btnHome">
                Home
            </a>
            
            <a href="../history/index.html" class="rounded-2xl p-2 px-4 hover:bg-sky-700 transition-all" id="btnHistory">
                History
            </a>
            
            <a href="../clients/index.html" class="rounded-2xl p-2 px-4 hover:bg-sky-700 transition-all" id="btnClients">
                Clients
            </a>
            
            <button id="profile" class="px-4">
                <img src="../../general-assets/profile.png" alt="Profile"
                    class="h-12 w-10 m:h-12 sm:w-12 rounded-full hover:bg-sky-700 transition-all">
            </button>
        </div>
    </nav>

`};


