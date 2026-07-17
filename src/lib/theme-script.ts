/**
 * Executado inline antes da hidratação: aplica o tema salvo no cookie
 * à classe do <html>, sem flash de tema errado.
 * (Módulo separado do ThemeProvider para poder ser importado em RSC.)
 */
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);var t=m?m[1]:"dark";var c=document.documentElement.classList;if(t==="dark"){c.add("dark")}else{c.remove("dark")}document.documentElement.style.colorScheme=t}catch(e){}})();`;
