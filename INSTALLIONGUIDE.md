# Instructions to build the project
The README.md does not provide very helpful instructions to be able to successfully build the project. The following instructions point the various footguns 
that one might run into. 

> **_NOTE:_**  I would not recommend using docker to run the app as I could not get the port forwarding to get working. If you really know your stuff you are welcome.

> **_OS:_**  If you are on windows, then you should  download ubuntu from the microsoft store and use it to install all the following stuff on it. This is because mariadb is not available on windows and you will need ubuntu or any linux distro available as wsl. The most straighforward option is to use ubuntu. All the following instructions were executed on ubuntu.

## Installing stuff
- Make sure you install `Go` using the instructions provided on Go's website
- Install `mariadb` using the instructions in the readme but after installing and starting its service make sure that you create a user by executing the following commands:
   ```
    CREATE USER 'discuit'@'localhost' IDENTIFIED BY 'discuit'; 
    GRANT ALL PRIVILEGES ON *.* TO 'discuit'@'localhost';
    FLUSH PRIVILEGES;
    ```
- This way you will be able to define a user with the same credentials as defined `config.yaml`.
- Then you should install `redis` by following the same instructions as in the readme.
- Finally install `libvips`.

## Running the App
- After installing the necessary stuff you should execute `.build.sh` in the top level directory.
- Now you should run the migration sql scripts by executing 
  ```
   ./discuit migrate run database migrations
  ```
- Finally we can serve the app by executing
  ```
     ./discuit serve
  ```