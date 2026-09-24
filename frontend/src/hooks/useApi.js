import { useCallback, useEffect, useRef, useState } from "react";

export function useApi(fn) {
  const [data, setData] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    return fnRef.current()
      .then((r) => {
        setData(r);
        setCarregando(false);
        return r;
      })
      .catch((e) => {
        setErro(e);
        setCarregando(false);
      });
  }, [fn]);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar]);

  return { data, setData, erro, carregando, recarregar: carregar };
}
