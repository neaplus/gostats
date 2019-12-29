(function (w, d, ss, n, t, i, x) {
    const init = !!JSON.parse(String(x).toLowerCase()) && !ss.getItem(n);
    i = !!ss.getItem('i') ? ss.getItem('i') : i;
    t = (parseInt(t) || 0) - (!!ss.getItem(n) ? new Date().valueOf() - ss.getItem(n) : 0);
    let f = function () {
        let ts = new Date().valueOf();
        ss.setItem(n, ts);
        var c = d.getElementById(n),
            s = d.createElement('script'),
            p = d.createElement('a');
        p.setAttribute('href', c.src);
        s.id = n;
        s.src = p.origin + p.pathname + '?c=' + i + '&v=' + ts;
        s.async = !0;
        c.parentNode.insertBefore(s, c);
        c.remove();
    };
    if (t > 0) {
        ss.setItem('i', i);
        setTimeout(f, init ? 0 : t);
    } else {
        ss.removeItem(n);
    }
})(window, document, sessionStorage, 'gos', '[ST]', '[XID]', '[INIT]')