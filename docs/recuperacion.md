# Recuperación en producción

Estos pasos se ejecutan en el servidor, dentro de `/root/gastodehoy`. Ese directorio está en la rama `main`. Quien los siga no necesita haber construido el sistema.

Hay dos cosas distintas. El código se vuelve a construir con `scripts/deploy-docker-prod.sh`. Los datos son el archivo SQLite `data/gastodehoy.db` (dentro del contenedor, `/app/data/gastodehoy.db`). El despliegue no sustituye ese archivo. Restaurar una copia no cambia el commit que se construye.

Staging es otro directorio y otra rama: `/root/gastodehoy-dev`, rama `develop`, script `scripts/deploy-staging.sh`. Ese script sí hace `git fetch`, `git checkout develop` y `git pull`. No sirve para recuperar producción.

## Volver a la versión anterior

`scripts/deploy-docker-prod.sh` no hace `git pull` ni cambia de commit. Para el contenedor `app`, lo para, lo elimina, borra la imagen de `app`, construye con `--no-cache` y vuelve a crear solo `app` a partir de los archivos que haya en `/root/gastodehoy`. Mientras construye, el sitio está parado. El archivo `data/gastodehoy.db` sigue donde está.

1. Anota el commit actual y elige el anterior en la historia de este clon.

```bash
cd /root/gastodehoy
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -15
```

`git rev-parse --abbrev-ref HEAD` tiene que imprimir `main` antes de mover nada, y `git status` no debe mostrar cambios locales: el script construye los archivos del directorio y solo usa `git rev-parse HEAD` para etiquetar la imagen. El commit de la primera línea de `git log` es ese `HEAD`. Elige el commit previo al que quieres dejar, y copia su hash.

Si `git checkout` dice que no encuentra ese hash, tráelo con `git fetch origin` y repite el checkout. No lances `scripts/deploy-staging.sh`.

2. Deja el árbol de trabajo en ese commit. El script construye `HEAD`.

```bash
git checkout <commit-anterior>
```

Eso no mueve el nombre `main`: el árbol queda en el commit elegido. Un `git pull` posterior de `main`, seguido del script de producción, volvería a construir la versión nueva.

3. Despliega ese árbol.

```bash
./scripts/deploy-docker-prod.sh
```

Al arrancar, la aplicación aplica los pasos de esquema SQLite que aún no estén anotados en `schema_migrations`. Volver a un commit anterior no deshace esos pasos ni sustituye `data/gastodehoy.db`. Si el fallo está en los datos, usa la sección siguiente.

Para publicar otra vez el `main` reciente: `git checkout main` y, de nuevo, `./scripts/deploy-docker-prod.sh`.

## Restaurar una copia

Las copias de producción son archivos `gastodehoy-*.db.gz`. Con el directorio por defecto de `scripts/backup.sh` (`./backups`) están en `/root/gastodehoy/backups`. El nombre lleva la fecha en UTC: `gastodehoy-YYYYMMDDTHHMMSSZ.db.gz`.

```bash
cd /root/gastodehoy
ls -lt backups/gastodehoy-*.db.gz
```

`./scripts/backup.sh check <archivo.gz>` comprueba la integridad y se niega a sustituir `data/gastodehoy.db`. Descomprime ese `.gz` a un temporal, lo abre con `sqlite3`, ejecuta `PRAGMA integrity_check` y borra el temporal. Tiene que imprimir exactamente `ok`. Si el resultado es otro, sale con un código distinto de 0. No restaura: el archivo vivo solo se cambia en el último paso, y solo a mano.

Haz los cinco pasos en este orden, en la misma shell, para que `stamp` no cambie. No descomprimas el `.gz` encima de `data/gastodehoy.db`.

1. Aparta la base actual. Cópiala; no la borres. SQLite trabaja en modo WAL, así que aparta también los laterales si existen.

```bash
cd /root/gastodehoy
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "data/antes-${stamp}"
cp -a data/gastodehoy.db "data/antes-${stamp}/gastodehoy.db"
if [ -f data/gastodehoy.db-wal ]; then
  cp -a data/gastodehoy.db-wal "data/antes-${stamp}/gastodehoy.db-wal"
fi
if [ -f data/gastodehoy.db-shm ]; then
  cp -a data/gastodehoy.db-shm "data/antes-${stamp}/gastodehoy.db-shm"
fi
```

2. Para la app. Usa los mismos archivos de Compose que el script de producción.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop app
```

La copia del paso 1 se tomó con la app en marcha y puede quedar a medias. Con el contenedor ya parado, cópiala otra vez encima de `data/antes-${stamp}/`. Esa es la base que hay que poder devolver.

```bash
cp -a data/gastodehoy.db "data/antes-${stamp}/gastodehoy.db"
if [ -f data/gastodehoy.db-wal ]; then
  cp -a data/gastodehoy.db-wal "data/antes-${stamp}/gastodehoy.db-wal"
fi
if [ -f data/gastodehoy.db-shm ]; then
  cp -a data/gastodehoy.db-shm "data/antes-${stamp}/gastodehoy.db-shm"
fi
```

3. Descomprime el `.gz` elegido a un temporal. Sustituye el nombre por el archivo de `ls`.

```bash
gunzip -c backups/gastodehoy-YYYYMMDDTHHMMSSZ.db.gz > "/tmp/gastodehoy-restaurar-${stamp}.db"
```

4. Comprueba el `.gz`. Este comando no escribe `data/gastodehoy.db`.

```bash
./scripts/backup.sh check backups/gastodehoy-YYYYMMDDTHHMMSSZ.db.gz
```

Tiene que imprimir `ok`. Si no lo imprime, no sigas al paso 5. Borra el temporal y arranca la app: el archivo vivo no se ha tocado.

```bash
rm -f "/tmp/gastodehoy-restaurar-${stamp}.db"
docker compose -f docker-compose.yml -f docker-compose.prod.yml start app
```

5. Solo cuando `check` haya impreso `ok`, quita el WAL viejo del directorio vivo (si se queda al lado del archivo nuevo, SQLite puede aplicarlo encima) y sustituye `data/gastodehoy.db`. El contenedor corre como `appuser`; el README fija ese usuario en el UID 999. El archivo que acabas de copiar tiene que quedar suyo, o la app no puede escribirlo.

```bash
if [ -f data/gastodehoy.db-wal ]; then
  mv data/gastodehoy.db-wal "data/antes-${stamp}/gastodehoy.db-wal"
fi
if [ -f data/gastodehoy.db-shm ]; then
  mv data/gastodehoy.db-shm "data/antes-${stamp}/gastodehoy.db-shm"
fi
cp "/tmp/gastodehoy-restaurar-${stamp}.db" data/gastodehoy.db
rm -f "/tmp/gastodehoy-restaurar-${stamp}.db"
chown 999:999 data data/gastodehoy.db
docker compose -f docker-compose.yml -f docker-compose.prod.yml start app
```

`check` no hace este paso. La base anterior queda en `data/antes-${stamp}/`. Para deshacer la restauración: para la app, copia esos archivos de vuelta a `data/gastodehoy.db`, `data/gastodehoy.db-wal` y `data/gastodehoy.db-shm` (solo los que existan), repite el `chown` y arranca otra vez.

## Cuánto tiempo se guardan

**Copias.** El cron de producción, cada día a las 03:30, es:

```cron
30 3 * * * cd /root/gastodehoy && ./scripts/backup.sh >> /var/log/gastodehoy-backup.log 2>&1
```

Cada ejecución correcta escribe un `gastodehoy-<fecha>.db.gz` en `/root/gastodehoy/backups`. `KEEP_DAYS` vale 7 si no se cambia. Al terminar esa ejecución, el script borra los `gastodehoy-*.db.gz` de ese directorio con más días que `KEEP_DAYS`. El servidor tiene un solo disco. No hay copia en otro disco ni copia remota.

**Logs.** La línea de cron anterior añade la salida a `/var/log/gastodehoy-backup.log`. El chequeo de salud añade una línea a `/var/log/gastodehoy-health.log` cuando `https://gastodehoy.es/health` no responde 200. Una respuesta 200 no escribe en ese log. El repositorio no define rotación para `/var/log/gastodehoy-health.log` ni para `/var/log/gastodehoy-backup.log`. No hay un plazo de conservación de esos logs en el repositorio.
