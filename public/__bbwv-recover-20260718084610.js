(() => {
  try {
    const key = '__bbwv_chunk_recovered';
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    const target = new URL(window.location.href);
    target.searchParams.set('__bbwv', "20260718084610");
    window.location.replace(target.toString());
  } catch {
    try {
      const key = '__bbwv_chunk_recovered';
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {}
    window.location.reload();
  }
})();
