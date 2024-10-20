![RX-M, llc.](https://rx-m.com/rxm-cnc.svg)


# Global Encryption Day San Francisco


## Lab 1 - Cryptography in Software Development: Code & Commit Signing

Protecting files is one of the most common uses for encryption. We use some sort of unique artifact: a key, a secret,
something else that serves to encrypt our data and keep our bits secure. Knowing how to do so, even with the most basic
(and well used over time) tools is a fundamental skill.

But encryption is also about trust - trusting that our data is not only secure in storage, but that it is only visible
to the intended audience (our recipient). We can use those same keys (or at least something related to them) to build a
basis of trust for not only our files but the way we present them - like our git commits!

In this lab, you will explore a couple of encryption related topics that will train you on how to use encryption to not
only protect your files, but also serve as the basis of trust:

- How to encrypt individual files to protect their contents
- How to sign Git commits before pushing them to a repository (which we'll host locally using `git daemon`)


### 0. Connect to the lab VM

You will be assigned an AWS workstation IP address and SSH key to complete the labs in this course.

To access your instance:

Open an SSH client in a Terminal on MacOS or Putty/MobaXterm on Windows. Locate your private key file (e.g. key.pem).
Your key must not be publicly viewable for SSH to work; use the command `chmod 400 key.pem` if needed:

```
@laptop:~$ chmod 400 \path-to-ssh-key\key.pem
```

Then, connect to your instance using its IP Address, username `ubuntu` and your SSH key. The `-i` option tells ssh to
use the specified identify file (private key). e.g. `ssh -i \path-to-ssh-key\key.pem ubuntu@<IP>`.

```
@laptop:~$ ssh -i \path-to-ssh-key\key.pem ubuntu@55.55.55.55

The authenticity of host '55.55.55.55 (55.55.55.55)' can't be established.
ECDSA key fingerprint is SHA256:PKRtJDb4CvjAq4Hh7qpISyZQdPXw3oc5QcJFRzhRkuQ.
Are you sure you want to continue connecting (yes/no)? yes

...

~$
```

When your prompt changes to something like `ubuntu@ip-172-31-4-159:~$` you are connected to the lab VM. This lab guide
has simplified that prompt to simply `~$` to indicate your user's home directory. When a lab intends for you to work in a
subdirectory of your home directory, that directory will be included in the prompt in the lab guide. For example, if the
lab is asking you to work in a subdirectory called "test", the prompt in the lab guide will look like this: `~/test$`.


### 0.1. Install Docker

We will be using Docker later in the lab to run the Git Daemon in a clean manner.

Use the Docker quick-install script to install Docker.

> DO NOT follow the instructions provided by the script's output!

```
~$ wget -qO - https://get.docker.com/ | bash

# Executing docker install script, commit: e5543d473431b782227f8908005543bb4389b8de

...

~$
```

Docker is running in a privileged mode, so all `docker` commands must be run with `sudo`:

```
~$ sudo docker version

Client: Docker Engine - Community
 Version:           27.3.1
 API version:       1.47
 Go version:        go1.22.7
 Git commit:        ce12230
 Built:             Fri Sep 20 11:40:59 2024
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          27.3.1
  API version:      1.47 (minimum version 1.24)
  Go version:       go1.22.7
  Git commit:       41ca978
  Built:            Fri Sep 20 11:40:59 2024
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          1.7.22
  GitCommit:        7f7fdf5fed64eb6a7caf99b3e12efcf9d60e311c
 runc:
  Version:          1.1.14
  GitCommit:        v1.1.14-0-g2c9f560
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0

~$
```


## Basic File Encryption (and signing!)


### 1. Prepare the code

First we need to download the gzipped package for Golang from Google. To do that we will use the `wget` application.

Download the Go package:

```
~$ wget https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz

--2024-10-15 02:00:29--  https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz
Resolving dl.google.com (dl.google.com)... 142.250.191.46, 2607:f8b0:4005:80f::200e
Connecting to dl.google.com (dl.google.com)|142.250.191.46|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 73611540 (70M) [application/x-gzip]
Saving to: ‘go1.23.2.linux-amd64.tar.gz’

go1.23.2.linux-amd64.tar.gz  100%[==============================================>]  70.20M   135MB/s    in 0.5s

2024-10-15 02:00:29 (135 MB/s) - ‘go1.23.2.linux-amd64.tar.gz’ saved [73611540/73611540]

~$
```

Next extract the archive into a directory where you would like it to live. In this example we will extract it to
`/usr/local`. Where ever you decide to extract it to, make note of that location. We will need it for the next step.

```
~$ sudo tar -C /usr/local/ -xzf go1.23.2.linux-amd64.tar.gz

~$
```

Now we will add the path from the previous step to our environment PATH variable. 

Add `xport PATH=$PATH:/usr/local/go/bin` to the `.profile` file in your home directory, then source it so it's active:

```
~$ echo "export PATH=$PATH:/usr/local/go/bin" >> $HOME/.profile

~$ source ~/.profile
```

We should be able to use Go now. Let's test to make sure it's working. Typing `go version` we should see something like
this

```
~$ go version

go version go1.23.2 linux/amd64

~$
```

Now lets write a quick Go application to make sure everything is ready to go (no pun intended).

First create a new directory for the lab and change into it:

```
~$ mkdir -p ~/lab1 ; cd $_

~/lab1$
```

In the **lab1** directory create a new Go module named `main` modules are how Go manages dependencies. A module
is a collection of packages that are released, versioned, and distributed together. Modules may be downloaded directly
from version control repositories or from module proxy servers. 

In our case, we're creating a new module:

```
~/lab1$ go mod init main

go: creating new go.mod: module main

~/lab1$
```

With our module created we will now create our `main.go` file where we will write our code. Again these instructions
will be using `nano` as the code editor, but please feel free to use whatever editor you are most comfortable with.

```
~/lab1$ nano main.go ; cat $_
```

This is going to be a very simple program. Just a simple webserver that listens on port 8080 and responds on the root
("/") route with `Hello World!` when it receives a request:

> N.B. Be sure your code is formatted **exactly** like the example below. If any indentation is missing, the code will
> not run.

```go
package main

import (
	"fmt"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	response := "Hello World!"
	fmt.Fprintln(w, response)
	fmt.Println("Processing hello request.")
}

func listenAndServe(port string) {
	fmt.Printf("Listening on port %s\n", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

func main() {
	http.HandleFunc("/", helloHandler)
	port := "8080"
	go listenAndServe(port)
	select {}
}
```

Press `Ctrl+O` to save the file and `Ctrl+X` to exit nano.

We are now ready to run our program. Run the commands below and you should see "Hello World." print out to the console:

```
~/lab1$ go run main.go &

[1] 2570

# wait about 30 seconds

Listening on port 8080

~/lab1$ curl localhost:8080

Processing hello request.
Hello world!

~/lab1$ pkill go

[1]+  Terminated              go run main.go

~/lab1$
```

Alright! The code is ready for all sorts of exciting (and hopefully encryption-related) things!


### 2. Key management

Ubuntu has a cryptographic key management system as part of the operating system. It utilizes a tool called gpg (GNU
Privacy Guard), which is a free implementation of the OpenPGP standard for encrypting and signing data and managing
cryptographic keys.

`gpg` is pre-installed on most Ubuntu distributions, and it provides functionalities for generating, importing, exporting,
and managing cryptographic keys. It also supports encryption, decryption, and digital signatures using both symmetric
and asymmetric encryption algorithms.

To check if gpg is installed on an Ubuntu machine, you can open a terminal and run the following command:

```
~/lab1$ gpg --version

gpg (GnuPG) 2.4.4
libgcrypt 1.10.3
Copyright (C) 2024 g10 Code GmbH
License GNU GPL-3.0-or-later <https://gnu.org/licenses/gpl.html>
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Home: /home/ubuntu/.gnupg
Supported algorithms:
Pubkey: RSA, ELG, DSA, ECDH, ECDSA, EDDSA
Cipher: IDEA, 3DES, CAST5, BLOWFISH, AES, AES192, AES256, TWOFISH,
        CAMELLIA128, CAMELLIA192, CAMELLIA256
Hash: SHA1, RIPEMD160, SHA256, SHA384, SHA512, SHA224
Compression: Uncompressed, ZIP, ZLIB, BZIP2

~/lab1$
```

> N.B. If gpg is not installed on the system, you can install it using the apt package manager by running:
>
>```
>~/lab1$ sudo apt update && sudo apt install gnupg
>```

The first thing we need to do is to generate a key pair. There's really not much we can do without one, so type in:
`gpg --key-gen`

You'll be asked for a name and email address.

```
~/lab1$ gpg --gen-key

gpg (GnuPG) 2.4.4; Copyright (C) 2024 g10 Code GmbH
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

gpg: directory '/home/ubuntu/.gnupg' created
gpg: keybox '/home/ubuntu/.gnupg/pubring.kbx' created
Note: Use "gpg --full-generate-key" for a full featured key generation dialog.

GnuPG needs to construct a user ID to identify your key.

Real name: GESF2024 Attendee
Email address: attendee@gesf2024.event
You selected this USER-ID:
    "GESF2024 Attendee <attendee@gesf2024.event>"

Change (N)ame, (E)mail, or (O)kay/(Q)uit? O
```

Here we need to type 'O' for Okay. After you enter 'O' you will be prompted to enter and re-enter a passphrase for the
new key pair. For the lab, use a simple and/or memorable passphrase for the key and make note of it for subsequent use.

```
We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.
We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.
gfdgpg: /home/ubuntu/.gnupg/trustdb.gpg: trustdb created
gpg: directory '/home/ubuntu/.gnupg/openpgp-revocs.d' created
gpg: revocation certificate stored as '/home/ubuntu/.gnupg/openpgp-revocs.d/C50A324593A99648D7B064C9E41D7D6F14B3872D.rev'
public and secret key created and signed.

pub   ed25519 2024-10-15 [SC] [expires: 2027-10-15]
      C50A324593A99648D7B064C9E41D7D6F14B3872D
uid                      GESF2024 Attendee <attendee@gesf2024.event>
sub   cv25519 2024-10-15 [E] [expires: 2027-10-15]
```

Let's make sure that the key is in our key database. Type in `gpg --list-keys` and you should see something like the following:

```
~/lab1$ gpg --list-keys

gpg: checking the trustdb
gpg: marginals needed: 3  completes needed: 1  trust model: pgp
gpg: depth: 0  valid:   1  signed:   0  trust: 0-, 0q, 0n, 0m, 0f, 1u
gpg: next trustdb check due at 2027-10-15
/home/ubuntu/.gnupg/pubring.kbx
-------------------------------
pub   ed25519 2024-10-15 [SC] [expires: 2027-10-15]
      C50A324593A99648D7B064C9E41D7D6F14B3872D
uid           [ultimate] GESF2024 Attendee <attendee@gesf2024.event>
sub   cv25519 2024-10-15 [E] [expires: 2027-10-15]

~/lab1$
```


### 2. Basic encryption

So, now that we have a key pair to work with let's encrypt a file. You can use any file you like, but this step will lead
you through encrypting one the `main.go` file we have been using in the previous section.

```
~/lab1$ gpg --output main.encrypted --encrypt --recipient attendee@gesf2024.event main.go

~/lab1$
```

The command produces no output but if we do a directory listing we will see `main.encrypted` in our directory.

```
~/lab1$ ls -l

total 12
-rw-rw-r-- 1 ubuntu ubuntu  23 Oct 15 02:06 go.mod
-rw-rw-r-- 1 ubuntu ubuntu 473 Oct 15 02:13 main.encrypted
-rw-r--r-- 1 ubuntu ubuntu 496 Oct 15 02:07 main.go

~/lab1$
```

When the encrypted data is written to the file, the raw byte array is written out, so if you open the file in an editor
you will see the byte array shown as binary symbols and odd characters.

```
~/lab1$ cat main.encrypted

��Z/!z0w��5jT� �s��m.�....

~/lab1$
```

Now that we have an encrypted file the logical thing for us to do is to decrypt it back into it's original text. So,
from the command line type in `gpg --output main.decrypted --decrypt main.encrypted` and you should see something
like the following:

```
~/lab1$ gpg --output main.decrypted --decrypt main.encrypted

# You will be prompted for your password

gpg: encrypted with cv25519 key, ID 314F6538FAA46D1C, created 2024-10-15
      "GESF2024 Attendee <attendee@gesf2024.event>"

~/lab1$
```

Examine the decrypted file:

```
~/lab1$ cat main.decrypted
```
```go
package main

import (
	"fmt"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	response := "Hello World!"
	fmt.Fprintln(w, response)
	fmt.Println("Processing hello request.")
}

func listenAndServe(port string) {
	fmt.Printf("Listening on port %s\n", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

func main() {
	http.HandleFunc("/", helloHandler)
	port := "8080"
	go listenAndServe(port)
	select {}
}
```
```
~/lab1$
```

There's our code!


### 3. Using keys for signing and verification

Remember that asymmetric cryptography allows us to do more than encrypt and decrypt. We can also sign data and verify
that signature. A digital signature certifies and timestamps a document. If the document is subsequently modified in any
way, a verification of the signature will fail. A signature is created using the private key of the signer and the
signature is verified using the corresponding public key.

`gpg` gives us several options when signing data. The first one we are going to look at is using a detached signature.


### 3.1. Detached signature

The command below signs the code with a detached signature (`--detach-sig`) producing a file that contains the signature
for the file that we are signing. Typing the command below will produce a signature file named `main.sig`:

```
~/lab1$ gpg --output main.sig --detach-sig main.go

~/lab1$
```

The command produces no output but if we do a directory listing we will see `main.sig` in our directory:

```
~/lab1$ ls -l

total 20
-rw-rw-r-- 1 ubuntu ubuntu  23 Oct 16 01:47 go.mod
-rw-rw-r-- 1 ubuntu ubuntu 496 Oct 16 01:59 main.decrypted
-rw-rw-r-- 1 ubuntu ubuntu 472 Oct 16 01:57 main.encrypted
-rw-rw-r-- 1 ubuntu ubuntu 496 Oct 16 01:47 main.go
-rw-rw-r-- 1 ubuntu ubuntu 119 Oct 16 17:46 main.sig

~/lab1$
```

The signature file is ciphertext:

```
~/lab1$ cat main.sig

?u
!??Ө??sĆA
?.j?g??

~/lab1$
```

Both the code and detached signature are needed to verify the signature. The `--verify` option can be to check the
signature:

```
~/lab1$ gpg --verify main.sig main.go

gpg: Signature made Tue Oct 15 02:16:06 2024 UTC
gpg:                using EDDSA key C50A324593A99648D7B064C9E41D7D6F14B3872D
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1$
```

What would happen if we made a copy of the `main.go`? Would it still validate? Try it:

```
~/lab1$ cp main.go main.modified

~/lab1$ gpg --verify main.sig main.modified

gpg: Signature made Wed Oct 16 17:46:33 2024 UTC
gpg:                using EDDSA key 9D91D3A8B71FAD731FC486410AF52E6A1B37D701
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1$
```

The signature is still valid because the contents are identical. Now modify the copied file and attempt to verify the
signature once again:

```
~/lab1$ echo "new text" >> main.modified

~/lab1$ gpg --verify main.sig main.modified

gpg: Signature made Wed Oct 16 17:46:33 2024 UTC
gpg:                using EDDSA key 9D91D3A8B71FAD731FC486410AF52E6A1B37D701
gpg: BAD signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1$ 
```

The change is detected and the signature is no longer valid! Delete the copy with `rm main.modified`.


### 3.2. Combined signature and contents

Another type of signature option `gpg` gives us is to both encrypt and sign a file in one go using the `--sign` option.
The document is compressed before being signed, and the output is in binary format.

```
~/lab1$ gpg --output main.go.sig --sign main.go

~/lab1$
```

The `main.go.sig` file that gpg has written contains both the encrypted data from `main.go` as well as as signature that
we can use to verify the data.

```
~/lab1$ cat main.go.sig

������%��z�...

# ctrl c

~/lab1$
```

At this point we can either check the signature or check the signature and recover the original document. To just check
the signature use the `--verify` option:

```
~/lab1$ gpg --verify main.go.sig

gpg: Signature made Tue Oct 15 02:19:46 2024 UTC
gpg:                using EDDSA key 9D91D3A8B71FAD731FC486410AF52E6A1B37D701
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1$
```

To verify the signature and extract the original code use the `--decrypt` option. First though let's delete the existing
`main.go` file:

```
~/lab1$ rm main.go

~/lab1$
```

In the command below, the signed document to verify and recover is input with `--decrypt` and the recovered document is
output with `--output`, try it:

```
~/lab1$ gpg --output main.go --decrypt main.go.sig

gpg: Signature made Tue Oct 15 02:16:31 2024 UTC
gpg:                using EDDSA key C50A324593A99648D7B064C9E41D7D6F14B3872D
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1$
```

Now we should be able to open up `main.go` and see the original data in the file.

```
~/lab1$ cat main.go
```
```go
package main

import (
        "fmt"
        "net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
        response := "Hello World!"
        fmt.Fprintln(w, response)
        fmt.Println("Processing hello request.")
}

func listenAndServe(port string) {
        fmt.Printf("Listening on port %s\n", port)
        err := http.ListenAndServe(":"+port, nil)
        if err != nil {
                panic("ListenAndServe: " + err.Error())
        }
}

func main() {
        http.HandleFunc("/", helloHandler)
        port := "8080"
        go listenAndServe(port)
        select {}
}
```
```
~/lab1$
```

There is much more to `gpg`. For a full list of the command line options you can use `$ gpg --help`.


## Signing Commits

GPG has historically been used to verify the authenticity of all sorts of things, like messages. One of the most common
message types you will probably see these days (outside of emails or Slack storms) are Git commits. In a highly
collaborative environment like Git, it is good to enforce some kind of mechanism that collaborators can use to verify
the work of others.

We will use the simple git daemon server built into the git tool as our source code repository server. Git daemon is a
simple server for git repos that makes git repositories available over the `git://` protocol.


### 4. Set up Git Daemon and the target repo

In this step we'll create a container image to run the git daemon. Make a directory for the git daemon to use:

```
~/lab1$ mkdir -p ~/git-daemon ; cd $_

~/git-daemon$
```

Create a shell script to start the git daemon:

```
~/git-daemon$ nano git-daemon.sh ; cat $_
```
```sh
#!/bin/sh

git daemon --reuseaddr --base-path=. --export-all --verbose --enable=receive-pack
```
```
~/git-daemon$
```

If you are interested in the command switch details you can look them up in the git docs:
https://git-scm.com/docs/git-daemon

Make the script executable:

```
~/git-daemon$ chmod +x git-daemon.sh

~/git-daemon$
```

Next, we will create a Dockerfile; a Dockerfile contains all of the instructions for building a container image for
running software (binaries, libraries, executables, etc.). Our Git Daemon Dockerfile will use the lightweight `alpine`
Linux distribution as its operating environment; it will install the `git-daemon` package with the `apk` package
manager; copy the script we just created into our container image; and execute the script to run the Git Daemon with our
custom flags.

```
~/git-daemon$ nano Dockerfile ; cat $_
```
```Dockerfile
FROM alpine
RUN apk add --no-cache git-daemon
COPY git-daemon.sh /usr/local/bin/git-daemon.sh
EXPOSE 9418
WORKDIR /git
CMD ["/usr/local/bin/git-daemon.sh"]
```
```
~/git-daemon$
```

Use `docker image build` to build the image with the tag (`-t`) `git-daemon`:

```
~/git-daemon$ sudo docker image build -t git-daemon .

[+] Building 5.7s (9/9) FINISHED                                                                     docker:default
 => [internal] load build definition from Dockerfile                                                           0.1s
 => => transferring dockerfile: 190B                                                                           0.0s
 => [internal] load metadata for docker.io/library/alpine:latest                                               1.2s
 => [internal] load .dockerignore                                                                              0.0s
 => => transferring context: 2B                                                                                0.0s
 => [1/4] FROM docker.io/library/alpine:latest@sha256:beefdbd8a1da6d2915566fde36db9db0b524eb737fc57cd1367effd  1.0s
 => => resolve docker.io/library/alpine:latest@sha256:beefdbd8a1da6d2915566fde36db9db0b524eb737fc57cd1367effd  0.0s
 => => sha256:33735bd63cf84d7e388d9f6d297d348c523c044410f553bd878c6d7829612735 528B / 528B                     0.0s
 => => sha256:91ef0af61f39ece4d6710e465df5ed6ca12112358344fd51ae6a3b886634148b 1.47kB / 1.47kB                 0.0s
 => => sha256:43c4264eed91be63b206e17d93e75256a6097070ce643c5e8f0379998b44f170 3.62MB / 3.62MB                 0.4s
 => => sha256:beefdbd8a1da6d2915566fde36db9db0b524eb737fc57cd1367effd16dc0d06d 1.85kB / 1.85kB                 0.0s
 => => extracting sha256:43c4264eed91be63b206e17d93e75256a6097070ce643c5e8f0379998b44f170                      0.2s
 => [internal] load build context                                                                              0.1s
 => => transferring context: 133B                                                                              0.0s
 => [2/4] RUN apk add --no-cache git-daemon                                                                    2.7s
 => [3/4] ADD git-daemon.sh /usr/local/bin/git-daemon.sh                                                       0.2s
 => [4/4] WORKDIR /git                                                                                         0.0s
 => exporting to image                                                                                         0.3s
 => => exporting layers                                                                                        0.2s
 => => writing image sha256:4587185c2deeb4e06191ea93b82e9d4af4d573e023d0cc8331df54cc179fba24                   0.0s
 => => naming to docker.io/library/git-daemon                                                                  0.0s

~/git-daemon$
```

With this image we can run the git daemon almost anywhere.

Time to run it with the following options:
- `--name` gives the name of `git-daemon` for easier log reference
- `-d` runs this container in the background
- `-v /tmp/git:/git` binds a host directory under `/tmp/git` to a container directory at `/git`
- `git-daemon` states which container image to run from

```
~/git-daemon$ sudo docker container run --name git-daemon -d -v /tmp/git:/git git-daemon

16703aaff81f170ef027dc8bff94edba77f284f5689c4df5b874ebf753d795b8

~/git-daemon$
```

The output should return a container ID that you can use to identify the container, or just use the name.

Inspect the container and see what its IP address it was assigned as you will need it to interact with the daemon:

```
~/git-daemon$ sudo docker container inspect git-daemon | grep IP

...

                    "IPAddress": "172.17.0.2",
                    "IPPrefixLen": 16,
                    "IPv6Gateway": "",
                    "GlobalIPv6Address": "",
                    "GlobalIPv6PrefixLen": 0,

~/git-daemon$
```

We can contact the container at `172.17.0.2` (if this is the only container on your VM at the moment, you will likely
get the same IP as the example one.)

Save the IP to some environment variable for easier reference:

```
~/git-daemon$ export GITDADDR=172.17.0.2 && echo $GITDADDR

~/git-daemon$
```

Finally, confirm that the Git Daemon is ready for action:

```
~/git-daemon$ sudo docker logs git-daemon

[8] Ready to rumble

~/git-daemon$
```

Excellent! You now have a local Git server that you can do basic push & pull operations from.

Continue by creating a new repository for our Git daemon to serve with the following options:

1. The `/tmp/git` directory was automatically created by Docker when the `git-daemon` container was created. Since it
   was created by root, you need to initialize the new repo with sudo.
2. To ensure everyone has access to the repo, initialize it with the `--shared=all` option. We also set up the `main`
   branch with the `-b` option. Finally, since it is empty we want to keep it as a bare repo. The git docs describe bare
   repos as:

> Instead of creating <directory> and placing the administrative files in <directory>/.git, make the <directory> itself
> the $GIT_DIR. This obviously implies the --no-checkout because there is nowhere to check out the working tree. Also
> the branch heads at the remote are copied directly to corresponding local branch heads, without mapping them to
> refs/remotes/origin/. When this option is used, neither remote-tracking branches nor the related configuration
> variables are created.

```
~/git-daemon$ sudo git init --bare --shared=all -b main /tmp/git/hello-world.git

Initialized empty Git repository in /home/ubuntu/hello-world/

~/git-daemon$
```

Change directories into the `lab1` directory from earlier, then clone the repo:

```
~/git-daemon$ cd ~/lab1/

~/lab1$ git clone git://$GITDADDR/hello-world.git

Cloning into 'hello-world'...
warning: You appear to have cloned an empty repository.

~/lab1$
```

Good sign! It is empty for now (aside from having a `main` branch.)

Change directories into the new clone and check its status:

```
~/lab1$ cd hello-world

~/lab1/hello-world$ git status

On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)

~/lab1/hello-world$
```

Looks like the repo is ready to accept files (and commits).


### 5. Signing commits in a Git repo

Now that you have a functional repository, it's time to get committing. First, set up a user name and email that will
serve as basic identifiers for your commits:

```
~/lab1/hello-world$ git config --global user.email "attendee@gesf2024.event"

~/lab1/hello-world$ git config --global user.name "GESF2024 Attendee"
```

Using the `--global` flag ensures that these settings apply for all repos. Omitting them causes those settings to be
valid only on that repository.

Copy in the (decrypted) `main.go` file from the previous step and confirm its presence:

```
~/lab1/hello-world$ cp ~/lab1/main.go .

~/lab1/hello-world$ ls -l

total 4
-rw-rw-r-- 1 ubuntu ubuntu 496 Oct 15 02:33 main.go

~/lab1/hello-world$
```

Let's do a very basic commit to start us off.

Add the file and check the repo status:

```
~/lab1/hello-world$ git add main.go

~/lab1/hello-world$ git status

On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   main.go

~/lab1/hello-world$
```

Go ahead and do the standard commit, appending your message with `-m`:

```
~/lab1/hello-world$ git commit -m "initial commit of main.go"

[master (root-commit) 3045a94] initial commit of main.go
 1 file changed, 27 insertions(+)
 create mode 100644 main.go

~/lab1/hello-world$ git log -1

commit b38f7f773ee193b7cb036c12dc099f634a2ccd1b (HEAD -> main)
Author: GESF2024 Attendee <attendee@gesf2024.event>
Date:   Tue Oct 15 02:35:00 2024 +0000

    initial commit of main.go

~/lab1/hello-world$
```

The commit log in the repo states who did it, listing the name and email provided in the earlier config files. These may
be okay for basic authentication, but (especially for folks who use many workstations) it is better to provide
additional methods of verifying commits.

Just to test out the functionality of the Git Daemon, push the first commit:

```
~/lab1/hello-world$ git push

Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Delta compression using up to 2 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 516 bytes | 516.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0
To git://172.17.0.2/hello-world.git
 * [new branch]      main -> main

~/lab1/hello-world$
```

Great. So far, we are capable of creating commits and pushing them. The only identifying information regarding who did
our commit comes from the options we set earlier with regards to the username and email. While that may be enough for
GitHub (or our git server) to authenticate us, it may not be enough for other collaborators to be sure that whatever
work we put into the repository is actually from us.

Enter GPG! We can use the same public key verification scheme to help others verify that a given commit actually came
from us.

The `git` client is capable of being informed about our signing keys, and we can also tell a commit to get signed.

List out the secret keys you set up previously:

```
~$ gpg --list-secret-keys --keyid-format long

/home/ubuntu/.gnupg/pubring.kbx
-------------------------------
sec   ed25519/E41D7D6F14B3872D 2024-10-15 [SC] [expires: 2027-10-15]
      C50A324593A99648D7B064C9E41D7D6F14B3872D
uid                 [ultimate] GESF2024 Attendee <attendee@gesf2024.event>
ssb   cv25519/314F6538FAA46D1C 2024-10-15 [E] [expires: 2027-10-15]

~$
```

We want to pick the key that's capable of signing. This is indicated by the presence of `[S]` in some form (the first
one in the example has `[SC]` from this line in the output:
`sec   ed25519/E41D7D6F14B3872D 2024-10-15 [SC] [expires: 2027-10-15]`).

Use that signature-capable key as your git client's signing key (_be sure to replace the example below with your key_):

```
~$ git config --global user.signingkey E41D7D6F14B3872D   # Use the string that follows ed25519/ from your terminal!
```

Git is now configured to use that signing key for all repositories handled on this VM.

Now let's add another file to commit - create a `README.md` (which every repo should have!) and stage it for commit:

```
~/lab1/hello-world$ echo "# Hello world!" >> README.md

~/lab1/hello-world$ git add README.md

~/lab1/hello-world$ git status

On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        new file:   README.md

~/lab1/hello-world$
```

Try to commit with a signature:

> N.B. Be sure to pass `export GPG_TTY=$(tty)` to inform GPG where to prompt for a password. If not, you will receive a
> `signing failed: Inappropriate ioctl for device` error.

```
~/lab1/hello-world$ export GPG_TTY=$(tty)    # This enables GPG to ask for a password in your terminal

~/lab1/hello-world$ git commit -S -m "add a new README"

[main 976115a] add a new README
 1 file changed, 1 insertion(+)
 create mode 100644 README.md

~/lab1/hello-world$
```

After the password prompt, your commit will now be signed!

This shows up in the `git log` output if you pass the `--show-signature` option:

```
~/lab1/hello-world$ git log -1 --show-signature

commit 976115a1d22825acd2b18955f1a128d5f3719890 (HEAD -> main)
gpg: Signature made Tue Oct 15 03:06:08 2024 UTC
gpg:                using EDDSA key C50A324593A99648D7B064C9E41D7D6F14B3872D
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]
Author: GESF2024 Attendee <attendee@gesf2024.event>
Date:   Tue Oct 15 03:06:08 2024 +0000

    add a new README

~/lab1/hello-world$
```

The signature is embedded into the commit, so when you push the signature will go with it to the repository:

```
~/lab1/hello-world$ git push

...

~/lab1/hello-world$
```

You have now successfully added your first signed commit to your new repository! Let's make a clone of the remote repo
and verify the signature.

```
~/lab1/hello-world$ cd ..

~/lab1$ git clone git://$GITDADDR/hello-world.git hw-copy

Cloning into 'hw-copy'...
remote: Enumerating objects: 6, done.
remote: Counting objects: 100% (6/6), done.
remote: Compressing objects: 100% (4/4), done.
remote: Total 6 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
Receiving objects: 100% (6/6), done.

~/lab1$ cd hw-copy

~/lab1/hw-copy$
```

The `git verify-commit` command that will let you validate the commit's signature:

_Make sure you replace the example commit hash below with the commit hash from your terminal!_

```
:~/lab1/hw-copy$ git log -1

commit 976115a1d22825acd2b18955f1a128d5f3719890 (HEAD -> main, origin/main, origin/HEAD)
Author: GESF2024 Attendee <attendee@gesf2024.event>
Date:  Tue Oct 15 03:04:18 2024 UTC

    add a new README

~/lab1/hw-copy$ git verify-commit -v 976115a1d22825acd2b18955f1a128d5f3719890   # Replace this hash

tree e56e675ab20702d18bc795d38c7503143c5468c3
parent b38f7f773ee193b7cb036c12dc099f634a2ccd1b
author GESF2024 Attendee <attendee@gesf2024.event> 1728961568 +0000
committer GESF2024 Attendee <attendee@gesf2024.event> 1728961568 +0000

add a new README
gpg: Signature made Tue Oct 15 03:06:08 2024 UTC
gpg:                using EDDSA key C50A324593A99648D7B064C9E41D7D6F14B3872D
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]

~/lab1/hw-copy$
```

If you want to forego the `-S` option in subsequent `git commit` invocations and have all your commits signed by your
local client by default, you can set the `commit.gpgsign true` configuration:

```
~/lab1/hw-copy$ git config --global commit.gpgsign true
```

Now, anytime you commit anything in any repository, your chosen signing key will be used!

Commit verification is available online on many Git providers, and they typically request that you provide a public key
to your account. This results in a `Verified` or similar badge on your commits whenever they are viewed in a repository.

Setting this up is provider specific, so here are the links to the various documentation that will allow your verified
commits to speak for themselves when pushed up to your SCM!

- GitHub:
  https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account
- BitBucket: https://confluence.atlassian.com/bitbucketserver/using-gpg-keys-913477014.html
- GitLab: https://docs.gitlab.com/ee/user/project/repository/signed_commits/


### 6. Conclusion - a word on key management

The signing key is extremely important for verifying the authenticity of your commits, so take a good effort to try and
protect them. These can include:

- Regularly update your GPG key's expiration date.
- Keep your private keys secure, ideally using a hardware security token 
  - These can include things like YubiKey or other physical devices that can be secured with a passphrase
  - Even taking them off the local drive is a good measure to take - if nothing else, a USB key or other media in a
    secure box will be a good approach!
- If you suspect your key has been compromised, revoke it immediately and generate a new one.

One thing you might consider is having separate keys for signing, encryption, and even a long-running "original" key
used to generate more.

List the keys currently set up in your VM:

```
~/lab1/hw-copy$ cd ~/lab1

~/lab1$ gpg --list-keys

/home/ubuntu/.gnupg/pubring.kbx
-------------------------------
pub   ed25519 2024-10-15 [SC] [expires: 2027-10-15]
      C50A324593A99648D7B064C9E41D7D6F14B3872D
uid           [ultimate] GESF2024 Attendee <attendee@gesf2024.event>
sub   cv25519 2024-10-15 [E] [expires: 2027-10-15]
```

There is actually more than one key here: one for signing (`[SC]`) and the other for encryption `[E]`.

You can add an additional key to this public key by editing it with `gpg --edit-key`:

_Make sure you replace the example key ID below with the one from your terminal!_

```
~/lab1$ gpg --edit-key C50A324593A99648D7B064C9E41D7D6F14B3872D

gpg (GnuPG) 2.4.4; Copyright (C) 2024 g10 Code GmbH
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Secret key is available.

sec  ed25519/E41D7D6F14B3872D
     created: 2024-10-15  expires: 2027-10-15  usage: SC
     trust: ultimate      validity: ultimate
ssb  cv25519/314F6538FAA46D1C
     created: 2024-10-15  expires: 2027-10-15  usage: E
[ultimate] (1). GESF2024 Attendee <attendee@gesf2024.event>

gpg>
```

Type in `addkey` to append a new subkey, following the prompts 

```
gpg> addkey

Please select what kind of key you want:
   (3) DSA (sign only)
   (4) RSA (sign only)
   (5) Elgamal (encrypt only)
   (6) RSA (encrypt only)
  (10) ECC (sign only)
  (12) ECC (encrypt only)
  (14) Existing key from card

Your selection? 10   # This will generate an ed25519 key

Please select which elliptic curve you want:

   (1) Curve 25519 *default*
   (4) NIST P-384
   (6) Brainpool P-256

Your selection? 1   # The 25519 part of ed25519!

Please specify how long the key should be valid.
         0 = key does not expire
      <n>  = key expires in n days
      <n>w = key expires in n weeks
      <n>m = key expires in n months
      <n>y = key expires in n years

Key is valid for? (0) 2y   # This is inline with the previous subkeys

Key expires at Thu Oct 15 10:40:53 2026 UTC
Is this correct? (y/N) y
Really create? (y/N) y

We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.

sec  ed25519/E41D7D6F14B3872D
     created: 2024-10-15  expires: 2027-10-15  usage: SC
     trust: ultimate      validity: ultimate
ssb  cv25519/314F6538FAA46D1C
     created: 2024-10-15  expires: 2027-10-15  usage: E
ssb  ed25519/F0F7A7410AFADB6A
     created: 2024-10-15  expires: 2026-10-15  usage: S
[ultimate] (1). GESF2024 Attendee <attendee@gesf2024.event>

gpg>
```

There's a new signing key, indicated by `usage: S`:

Type `save` to commit the new key, then look at the keyid:

```
gpg> save

~/lab1$ gpg --list-keys --keyid-format long

/home/ubuntu/.gnupg/pubring.kbx
-------------------------------
pub   ed25519/E41D7D6F14B3872D 2024-10-15 [SC] [expires: 2027-10-15]
      C50A324593A99648D7B064C9E41D7D6F14B3872D
uid                 [ultimate] GESF2024 Attendee <attendee@gesf2024.event>
sub   cv25519/314F6538FAA46D1C 2024-10-15 [E] [expires: 2027-10-15]
sub   ed25519/F0F7A7410AFADB6A 2024-10-15 [S] [expires: 2026-10-15]

~/lab1$
```

Now, update your git config's signing key to use the new key:

```
~/lab1$ git config --global --unset user.signingkey   # Just to be sure

~/lab1$ git config --global user.signingkey F0F7A7410AFADB6A
```

Now the new signing key should be in use.

Go ahead and add a new file (like a `.gitignore`) to your repository and commit it:

```
~/lab1$ cd hello-world/

~/lab1/hello-world$ echo "*.html" >> .gitignore

~/lab1/hello-world$ git add .gitignore && git commit -m "add gitignore"

[main 4c066c7] add gitignore
 1 file changed, 1 insertion(+)
 create mode 100644 .gitignore

~/lab1/hello-world$
```

You should have been prompted for the password automatically - that's `commit.gpgsign true` at work!

Inspect the commit log, showing the signature:

```
~/lab1/hello-world$ git log -1 --show-signature

commit 4c066c779ba2c754ab5be03226f2ffe6d467006b (HEAD -> main)
gpg: Signature made Tue Oct 15 10:46:04 2024 UTC
gpg:                using EDDSA key 4C7D0C567C7C0946ABC377B0F0F7A7410AFADB6A
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]
Author: GESF2024 Attendee <attendee@gesf2024.event>
Date:   Tue Oct 15 10:46:04 2024 +0000

    add gitignore

~/lab1/hello-world$
```

Excellent! The new signing key is successfully in use for this repo (and all others if you did `--global`).

The final thing to do is ensure that the signing and encryption keys are the only keys on this machine. We can
accomplish this by:

- Exporting the public key, the secret key, and the subkeys into separate file
- Removing the secret key with `--delete-secret-keys`
- Reimporting only the subkeys with `--import` on the file containing only the subkeys

Export the three keys with the `--export` (for public), `--export-secret-key` (for the original key), and
`--export-secret-subkeys` (for the subkeys):

```
~/lab1/hello-world$ cd ..

# Use your own Key ID for the following commands. If you need to retrieve it use: gpg --list-keys

~/lab1$ gpg --output gesf24atnd.public.gpg --export-secret-key C50A324593A99648D7B064C9E41D7D6F14B3872D

~/lab1$ gpg --output gesf24atnd.secret.gpg --export-secret-key C50A324593A99648D7B064C9E41D7D6F14B3872D

~/lab1$ gpg --output gesf24atnd.subkeys.gpg --export-secret-subkeys C50A324593A99648D7B064C9E41D7D6F14B3872D

~/lab1$
```

At this point, take all the key files and put them somewhere safe (like a USB stick), and put said USB stick somewhere
physically safe.

Now, delete the secret keys from the local keyring:

```
~/lab1$ gpg --delete-secret-keys C50A324593A99648D7B064C9E41D7D6F14B3872D

gpg (GnuPG) 2.4.4; Copyright (C) 2024 g10 Code GmbH
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

sec  ed25519/E41D7D6F14B3872D 2024-10-15 GESF2024 Attendee <attendee@gesf2024.event>

Delete this key from the keyring? (y/N) y
This is a secret key! - really delete? (y/N) y

~/lab1$
```

You should have been asked to confirm three more times after saying "yes".

Then, import only the file containing the subkeys (which should prompt you for the password again):

```
~/lab1$ gpg --import gesf24atnd.subkeys.gpg

gpg: key E41D7D6F14B3872D: "GESF2024 Attendee <attendee@gesf2024.event>" not changed
gpg: To migrate 'secring.gpg', with each smartcard, run: gpg --card-status
gpg: key E41D7D6F14B3872D: secret key imported
gpg: Total number processed: 1
gpg:              unchanged: 1
gpg:       secret keys read: 1
gpg:   secret keys imported: 1

~/lab1$
```

After importing, your signing key should still be functional, so add something worth committing to your repo:

```
~/lab1$ cd hello-world/

~/lab1/hello-world$ echo "*.pdf" >> .gitignore

~/lab1/hello-world$ git add .gitignore && git commit -m "add pdf to gitignore"

[main a4cd7b6] add pdf to gitignore
 1 file changed, 1 insertion(+)

~/lab1/hello-world$ git log -1 --show-signature

commit a4cd7b629e902dd7781c8d7df85ac416adec4a14 (HEAD -> main)
gpg: Signature made Tue Oct 15 10:57:52 2024 UTC
gpg:                using EDDSA key 4C7D0C567C7C0946ABC377B0F0F7A7410AFADB6A
gpg: Good signature from "GESF2024 Attendee <attendee@gesf2024.event>" [ultimate]
Author: GESF2024 Attendee <attendee@gesf2024.event>
Date:   Tue Oct 15 10:57:52 2024 +0000

    add pdf to gitignore

~/lab1/hello-world$
```

Now if you try to edit the key and add more subkeys, that won't work:

```
~/lab1/hello-world$ gpg --edit-key C50A324593A99648D7B064C9E41D7D6F14B3872D   # Use your own Key ID

...

gpg> addkey

Need the secret key to do this.

gpg> q

~/lab1/hello-world$
```

You will have to re-import the secret key in order to do that.

Use the `--import` option on `gpg` to re-import the secret key:

```
~/lab1/hello-world$ gpg --import ~/lab1/gesf24atnd.secret.gpg

gpg: key E41D7D6F14B3872D: "GESF2024 Attendee <attendee@gesf2024.event>" not changed
gpg: key E41D7D6F14B3872D: secret key imported
gpg: Total number processed: 1
gpg:              unchanged: 1
gpg:       secret keys read: 1
gpg:   secret keys imported: 1
gpg:  secret keys unchanged: 1

~/lab1/hello-world$ gpg --edit-key C50A324593A99648D7B064C9E41D7D6F14B3872D

...

gpg> addkey

Please select what kind of key you want:
   (3) DSA (sign only)
   (4) RSA (sign only)
   (5) Elgamal (encrypt only)
   (6) RSA (encrypt only)
  (10) ECC (sign only)
  (12) ECC (encrypt only)
  (14) Existing key from card
Your selection? # ctrl C

gpg: signal Interrupt caught ... exiting

~/lab1/hello-world$
```

And there you go! Now when you need to regenerate an expired key, just import the secret again, regenerate, and delete
it. You definitely do not want anybody else to get that secret key!


### 7. Clean up

Push all remaining commits:

```
~/lab1/hello-world$ git push

...

~/lab1/hello-world$
```


## END OF LAB 1 - STOP HERE

<br>

## Lab 2 - "Keyless" Cryptography: Artifact Signing

Cosign is an open-source project under the Sigstore umbrella, focused on signing and verifying container images, making
it easier to ensure the integrity and publisher identity of containerized software. Sigstore, meanwhile, is a project
sponsored by the Linux Foundation to improve the security of the software supply chain. It provides public, transparent,
and auditable infrastructure for securely storing and retrieving cryptographic signing materials.

In this lab, we'll walk through the basic usage of Cosign, including signing and verifying container images.


### 1. Install Cosign

Let's install Cosign on our lab system. Its a very good idea always to check the official documentation for the latest
installation instructions which you can find [here](https://docs.sigstore.dev/cosign/system_config/installation/). For
our lab we are using an Ubuntu machine and can use the official dpkg-based method.

```
~$ LATEST_VERSION=$(curl https://api.github.com/repos/sigstore/cosign/releases/latest | grep tag_name | cut -d : -f2 | tr -d "v\", ")

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  193k    0  193k    0     0   564k      0 --:--:-- --:--:-- --:--:--  566k

~$ curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign_${LATEST_VERSION}_amd64.deb"

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
100 43.9M  100 43.9M    0     0  36.4M      0  0:00:01  0:00:01 --:--:--  112M

~$ sudo dpkg -i cosign_${LATEST_VERSION}_amd64.deb

Selecting previously unselected package cosign.
(Reading database ... 68102 files and directories currently installed.)
Preparing to unpack cosign_2.4.1_amd64.deb ...
Unpacking cosign (2.4.1) ...
Setting up cosign (2.4.1) ...

~$
```

This command will install the latest version of Cosign directly from the repository. You can verify the installation by
running the `version` command:

```
~$ cosign version

  ______   ______        _______. __    _______ .__   __.
 /      | /  __  \      /       ||  |  /  _____||  \ |  |
|  ,----'|  |  |  |    |   (----`|  | |  |  __  |   \|  |
|  |     |  |  |  |     \   \    |  | |  | |_ | |  . `  |
|  `----.|  `--'  | .----)   |   |  | |  |__| | |  |\   |
 \______| \______/  |_______/    |__|  \______| |__| \__|
cosign: A tool for Container Signing, Verification and Storage in an OCI registry.

GitVersion:    v2.4.1
GitCommit:     9a4cfe1aae777984c07ce373d97a65428bbff734
GitTreeState:  clean
BuildDate:     2024-10-03T17:01:50Z
GoVersion:     go1.22.7
Compiler:      gc
Platform:      linux/amd64

~$
```

There are a lot of options for Cosign; you can view them by running the `cosign help` command, try it:

```
~$ cosign help

A tool for Container Signing, Verification and Storage in an OCI registry.

Usage:
cosign [command]

Available Commands:
attach                  Provides utilities for attaching artifacts to other artifacts in a registry
attest                  Attest the supplied container image.
attest-blob             Attest the supplied blob.
clean                   Remove all signatures from an image.
completion              Generate completion script
copy                    Copy the supplied container image and signatures.
dockerfile              Provides utilities for discovering images in and performing operations on Dockerfiles
download                Provides utilities for downloading artifacts and attached artifacts in a registry
env                     Prints Cosign environment variables
generate                Generates (unsigned) signature payloads from the supplied container image.
generate-key-pair       Generates a key-pair.
help                    Help about any command
import-key-pair         Imports a PEM-encoded RSA or EC private key.
initialize              Initializes SigStore root to retrieve trusted certificate and key targets for verification.
load                    Load a signed image on disk to a remote registry
login                   Log in to a registry
manifest                Provides utilities for discovering images in and performing operations on Kubernetes manifests
public-key              Gets a public key from the key-pair.
save                    Save the container image and associated signatures to disk at the specified directory.
sign                    Sign the supplied container image.
sign-blob               Sign the supplied blob, outputting the base64-encoded signature to stdout.
tree                    Display supply chain security related artifacts for an image such as signatures, SBOMs and attestations
triangulate             Outputs the located cosign image reference. This is the location where cosign stores the specified artifact type.
upload                  Provides utilities for uploading artifacts to a registry
verify                  Verify a signature on the supplied container image
verify-attestation      Verify an attestation on the supplied container image
verify-blob             Verify a signature on the supplied blob
verify-blob-attestation Verify an attestation on the supplied blob
version                 Prints the version

Flags:
    -h, --help=false:
	help for cosign

    --output-file='':
	log output to a file

    -t, --timeout=3m0s:
	timeout for commands

    -d, --verbose=false:
	log debug output

Additional help topics:
cosign piv-tool                This cosign was not built with piv-tool support!
cosign pkcs11-tool             This cosign was not built with pkcs11-tool support!

Use "cosign [command] --help" for more information about a command.

~$
```

The beauty of the help command is that you can also get help for commands like `cosign [command] --help`, for example:

```
~$ cosign generate-key-pair --help

Generates a key-pair for signing.

Usage:
cosign generate-key-pair [flags]

Examples:
  cosign generate-key-pair [--kms KMSPATH]

  # generate key-pair and write to cosign.key and cosign.pub files
  cosign generate-key-pair

  # generate key-pair and write to custom named my-name.key and my-name.pub files
  cosign generate-key-pair --output-key-prefix my-name

  # generate a key-pair in Azure Key Vault
  cosign generate-key-pair --kms azurekms://[VAULT_NAME][VAULT_URI]/[KEY]

  # generate a key-pair in AWS KMS
  cosign generate-key-pair --kms awskms://[ENDPOINT]/[ID/ALIAS/ARN]

  # generate a key-pair in Google Cloud KMS
  cosign generate-key-pair --kms gcpkms://projects/[PROJECT]/locations/global/keyRings/[KEYRING]/cryptoKeys/[KEY]

  # generate a key-pair in Hashicorp Vault
  cosign generate-key-pair --kms hashivault://[KEY]

  # generate a key-pair in Kubernetes Secret
  cosign generate-key-pair k8s://[NAMESPACE]/[NAME]

  # generate a key-pair in GitHub
  cosign generate-key-pair github://[OWNER]/[PROJECT_NAME]

  # generate a key-pair in GitLab with project name
  cosign generate-key-pair gitlab://[OWNER]/[PROJECT_NAME]

  # generate a key-pair in GitLab with project id
  cosign generate-key-pair gitlab://[PROJECT_ID]

CAVEATS:
  This command interactively prompts for a password. You can use
  the COSIGN_PASSWORD environment variable to provide one.

Flags:
    -h, --help=false:
	help for generate-key-pair

    --kms='':
	create key pair in KMS service to use for signing

    --output-key-prefix='cosign':
	name used for generated .pub and .key files (defaults to `cosign`)

Global Flags:
      --output-file string   log output to a file
  -t, --timeout duration     timeout for commands (default 3m0s)
  -d, --verbose              log debug output

~$
```

One of the most powerful things are the examples under the `Examples:` heading. Check them out and use them for your own
use case or borrow some good ideas!


### 2. Create a container image

Let's create a simple image to use for our lab. We will use the `main.go` code from our previous lab to build an image
with Docker and sign it with Cosign. First, create a directory to hold the files for this lab. Then, copy the code from
its previous location.

```
~$ mkdir ~/docker-image && cd $_

~/docker-image$ cp ~/lab1/main.go .
```

Now, create a Dockerfile to build an image that runs the Go program.

- We will use a preexisting image that has Golang already in it (`FROM docker.io/golang:1.23`)
- Copy the source file into the image using the Dockerfile COPY command (`COPY ...`)
- Run the program (`CMD ["go","run","hello.go"]`)

```
~/docker-image$ nano Dockerfile && cat $_
```
```dockerfile
FROM docker.io/golang:1.23
WORKDIR /go/src/hello
COPY ./main.go /go/src/hello
EXPOSE 8080
CMD ["go","run","main.go"]
```
```
~/docker-image$
```

To build the Docker image, use the `docker image build` command. The following command uses:

- `-t` - tags the image with a name
- `.` ( the dot ) - build the image from the current directory. Docker will search for a file named `Dockerfile` in the
  current directory and use it to build the image.

```
~/docker-image$ sudo docker image build -t rx-m-cosign:v1 .

sudo docker image build -t rx-m-cosign:v1 .
[+] Building 23.7s (8/8) FINISHED                                                                         docker:default
 => [internal] load build definition from Dockerfile                                                                0.0s
 => => transferring dockerfile: 154B                                                                                0.0s
 => [internal] load metadata for docker.io/library/golang:1.23                                                      1.0s
 => [internal] load .dockerignore                                                                                   0.0s
 => => transferring context: 2B                                                                                     0.0s
 => [1/3] FROM docker.io/library/golang:1.23@sha256:a7f2fc9834049c1f5df787690026a53738e55fc097cd8a4a93faa3e06c67e  22.2s
 => => resolve docker.io/library/golang:1.23@sha256:a7f2fc9834049c1f5df787690026a53738e55fc097cd8a4a93faa3e06c67ee  0.0s
 => => sha256:a7f2fc9834049c1f5df787690026a53738e55fc097cd8a4a93faa3e06c67ee32 9.74kB / 9.74kB                      0.0s
 => => sha256:345d5e81c88be2c500edf00ed1dca6be656e4485cd79e4e0bcc73a90361910e0 2.32kB / 2.32kB                      0.0s
 => => sha256:cdd62bf39133c498a16f7a7b1b6555ba43d02b2511c508fa4c0a9b1975ffe20e 49.56MB / 49.56MB                    0.8s
 => => sha256:a47cff7f31e941e78bf63ca19f0811b675283e2c00ddea10c57f78d93b2bc343 24.05MB / 24.05MB                    0.9s
 => => sha256:21bf67eca23e1da144aae7c021a7e5765cd680bb2bb16fa30abfb0fbe2bd81b1 2.86kB / 2.86kB                      0.0s
 => => sha256:a173f2aee8e962ea19db1e418ae84a0c9f71480b51f768a19332dfa83d7722a5 64.39MB / 64.39MB                    1.2s
 => => sha256:c77f309ae60d503a68cf1c32cf69b48daff39d7f8e9ae015734d1a8cfb762cbb 92.26MB / 92.26MB                    2.1s
 => => sha256:2ac1f1163629431c9f488c4d6ff6afb5c73021839723b50bafe245663ad3d9df 74.01MB / 74.01MB                    1.9s
 => => extracting sha256:cdd62bf39133c498a16f7a7b1b6555ba43d02b2511c508fa4c0a9b1975ffe20e                           3.7s
 => => sha256:4a078442501cc61dd9ee8eae2586e5b7e2abb756ccabceb5c1b2154700631cf0 126B / 126B                          1.3s
 => => sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1 32B / 32B                            1.4s
 => => extracting sha256:a47cff7f31e941e78bf63ca19f0811b675283e2c00ddea10c57f78d93b2bc343                           0.9s
 => => extracting sha256:a173f2aee8e962ea19db1e418ae84a0c9f71480b51f768a19332dfa83d7722a5                           4.0s
 => => extracting sha256:c77f309ae60d503a68cf1c32cf69b48daff39d7f8e9ae015734d1a8cfb762cbb                           3.8s
 => => extracting sha256:2ac1f1163629431c9f488c4d6ff6afb5c73021839723b50bafe245663ad3d9df                           7.8s
 => => extracting sha256:4a078442501cc61dd9ee8eae2586e5b7e2abb756ccabceb5c1b2154700631cf0                           0.0s
 => => extracting sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1                           0.0s
 => [internal] load build context                                                                                   0.0s
 => => transferring context: 532B                                                                                   0.0s
 => [2/3] WORKDIR /go/src/hello                                                                                     0.3s
 => [3/3] COPY ./main.go /go/src/hello                                                                              0.0s
 => exporting to image                                                                                              0.1s
 => => exporting layers                                                                                             0.0s
 => => writing image sha256:e70bdb75b062ebb7e413cbdd92785d3cedafad4f4f34335a84c655068f7cb9dc                        0.0s
 => => naming to docker.io/library/rx-m-cosign:v1                                                                   0.0s

~/docker-image$
```

Let's check the current docker images:

```
~/docker-image$ sudo docker image ls

REPOSITORY    TAG       IMAGE ID       CREATED          SIZE
rx-m-cosign   v1        e70bdb75b062   35 seconds ago   838MB
git-daemon    latest    bc7d9e90478e   2 hours ago      21.4MB

~/docker-image$
```

You can see the image we just built with the tag `rx-m-cosign:v1`.


### 2.1. Run the image

After the build process completes, you can run the Docker container using the command: `docker container run` with the
following options:

- `-d` runs this container in the background
- `--name`: name the container `rx-m-cosign`
- `rx-m-cosign:v1`: the image tag to use for the container

```
~/docker-image$ sudo docker container run -d --name rx-m-cosign rx-m-cosign:v1


~/docker-image$
```

To see our container running, we can use `docker container ls`:

```
~/docker-image$ sudo docker container ls

CONTAINER ID   IMAGE            COMMAND                  CREATED         STATUS         PORTS      NAMES
cc517aafbfad   rx-m-cosign:v1   "go run main.go"         2 minutes ago   Up 2 minutes   8080/tcp   rx-m-cosign

~/docker-image$
```

Try out the application:

> N.B. the nested shell command gets the IP address of the container from the container's metadata

```
~/docker-image$ curl $(sudo docker container inspect -f '{{ .NetworkSettings.IPAddress }}' rx-m-cosign):8080

Hello World!

~/docker-image$
```

Now that we have a working container image, we can sign it using Cosign!


### 3. Creating and managing keys

Cosign uses a pair of keys, _private_ and _public_, for signing and verifying respectively. The
`cosign generate-key-pair` command is used to create a private and public key for signing and verifying signatures with
Cosign.

The command below will generate a private key (`cosign.key`) and a public key (`cosign.pub`). The keys are
password-protected. Upon running the command, you'll be asked to enter a password which will be used to encrypt the
private key. You will need this password every time you use the private key to sign something. For the lab, use a simple
and/or memorable password for the key and make note of it for subsequent use.

Generate a key-pair:

```
~/docker-image$ mkdir ~/cosign-keys && cd $_

~/cosign-keys$ cosign generate-key-pair

Enter password for private key:             <<<< type your password
Enter password for private key again:       <<<< type your password
Private key written to cosign.key
Public key written to cosign.pub

~/cosign-keys$
```

You'll want to keep these keys in a secure location. The private key especially should not be shared or exposed. Anyone
with access to your private key could sign images or other artifacts as you!

The public key, on the other hand, is intended to be distributed. Anyone wishing to verify a signature you've made will
use this public key.

Here are some additional `generate-key-pair` command flag examples:

- `--kms` (optional) - if you want to store the private key in a KMS, you can use this flag followed by the KMS provider
  URL.
- `--password` (optional) - password for encrypting the private key. If not provided, the command will prompt for a
  password. Use this flag carefully, as command-line history may record this password.


### 4. Signing a container image

Now we have our container image `rx-m-cosign:v1` and our Cosign keys so it is time to sign our image! _Make sure you are
in the `~/cosign-keys` directory where you generated your keys_, then run the following command:

```
~/cosign-keys$ ls -lh

total 8.0K
-rw------- 1 ubuntu ubuntu 653 Oct 16 21:35 cosign.key
-rw-r--r-- 1 ubuntu ubuntu 178 Oct 16 21:35 cosign.pub

~/cosign-keys$
```

From the command above we can see that we have our keys in place. Now let's sign the image `rx-m-cosign:v1` using the
private key `cosign.key`.

```
~/cosign-keys$ cosign sign --key cosign.key rx-m-cosign:v1

Enter password for private key:           <<<< type your password

WARNING: Image reference rx-m-cosign:v1 uses a tag, not a digest, to identify the image to sign.
    This can lead you to sign a different image than the intended one. Please use a
    digest (example.com/ubuntu@sha256:abc123...) rather than tag
    (example.com/ubuntu:latest) for the input to cosign. The ability to refer to
    images by tag will be removed in a future release.

Error: signing [rx-m-cosign:v1]: accessing entity: GET https://index.docker.io/v2/library/rx-m-cosign/manifests/v1: UNAUTHORIZED: authentication required; [map[Action:pull Class: Name:library/rx-m-cosign Type:repository]]
main.go:74: error during command execution: signing [rx-m-cosign:v1]: accessing entity: GET https://index.docker.io/v2/library/rx-m-cosign/manifests/v1: UNAUTHORIZED: authentication required; [map[Action:pull Class: Name:library/rx-m-cosign Type:repository]]

~/cosign-keys$
```

Wow what happened here? We got an error! Let's try to understand what happened. Notice this first line of the output:

```
WARNING: Image reference rx-m-cosign:v1 uses a tag, not a digest, to identify the image to sign.
```

This warning is in the response about using a `tag` rather than a `digest` to identify the image. It is best practice to
use a `digest` to ensure you're signing the exact image you intend to. In a production setting, using the image digest
instead of the tag adds an extra layer of security because image tags can be moved, but digests are immutable.

```
~/cosign-keys$ sudo docker image ls rx-m-cosign --digests

REPOSITORY    TAG       DIGEST    IMAGE ID       CREATED          SIZE
rx-m-cosign   v1        <none>    e70bdb75b062   21 minutes ago   838MB

~/cosign-keys$
```

Wait, there is no `digest` for our image! Why doesn't the image have a `digest`?

The Docker daemon does not compute the digest for an image until it's pushed to a registry. This is because the digest
that Cosign needs is the `SHA256` hash of the image manifest, which is generated by a registry upon push. Notice this
error message:

```
Error: signing [rx-m-cosign:v1]: accessing entity: GET https://index.docker.io/v2/library/rx-m-cosign/manifests/v1: UNAUTHORIZED: authentication required;
```

The auth error message you're seeing is due to a lack of proper authentication. The `cosign sign` command needs to fetch
the manifest of the image from the image's registry, in this case Docker Hub; our image doesn't have a hostname as part
of its name and the Docker Engine is hard-coded to call Docker Hub unless it finds a hostname in an image's name.

You can resolve this issue by logging into the Docker Hub registry using `docker login` command (if we have an account).
We can work around this requirement in our lab by using a private and/or local registry.


### 4.1. Local registry

We can sign a locally built image without pushing it to a public registry or our organization's private registry by
running a local container registry on our lab VM. Docker provides a free open source registry container image that is
easy to launch using a single `docker` command:

```
~/cosign-keys$ sudo docker container run -d -p 5000:5000 --name registry registry:2

Unable to find image 'registry:2' locally
2: Pulling from library/registry
1cc3d825d8b2: Pull complete 
85ab09421e5a: Pull complete 
40960af72c1c: Pull complete 
e7bb1dbb377e: Pull complete 
a538cc9b1ae3: Pull complete 
Digest: sha256:ac0192b549007e22998eb74e8d8488dcfe70f1489520c3b144a6047ac5efbe90
Status: Downloaded newer image for registry:2
86fe986ff333620264abba41ec4a1bd4770fdffb90b056685f4eb53d53a7192f

~/cosign-keys$
```

Next, tag your image using `localhost` as the hostname and push it to your locally-running registry:

```
~/cosign-keys$ sudo docker image tag rx-m-cosign:v1 localhost:5000/rx-m-cosign:v1

~/cosign-keys$ sudo docker image push localhost:5000/rx-m-cosign:v1

The push refers to repository [localhost:5000/rx-m-cosign]
af369a6777e7: Pushed 
883916f5d9f9: Pushed 
5f70bf18a086: Pushed 
8917293be6e6: Pushed 
bb0b3c8fba07: Pushed 
e189cd766f83: Pushed 
f91dc7a486d9: Pushed 
3e14a6961052: Pushed 
d50132f2fe78: Pushed 
v1: digest: sha256:44f873350dc583a833cd22a0c5056b18b7f665e5cb93c6f8af6b83206a3815e4 size: 2204

~/cosign-keys$
```

Verify that the image has been assigned a digest by the registry:

```
~/cosign-keys$ sudo docker image ls localhost:5000/rx-m-cosign --digests

REPOSITORY                   TAG       DIGEST                                                                    IMAGE ID       CREATED          SIZE
localhost:5000/rx-m-cosign   v1        sha256:44f873350dc583a833cd22a0c5056b18b7f665e5cb93c6f8af6b83206a3815e4   e70bdb75b062   33 minutes ago   838MB

~/cosign-keys$
```

As you can see now we have a digest for the image we pushed to our local registry. Grab the image digest for the
`localhost:5000/rx-m-cosign:v1` and store it in environment variable for subsequent use:

```
~/cosign-keys$ export IMAGE_DIGEST=$(sudo docker image ls --digests | grep local | awk '{print $3}') && echo $IMAGE_DIGEST

sha256:44f873350dc583a833cd22a0c5056b18b7f665e5cb93c6f8af6b83206a3815e4

~/cosign-keys$
```

Now, you can sign this image using `cosign` and be sure to use the `IMAGE_DIGEST` variable. That way we will be sure we
are signing the right image. We already discussed why we should use the digest instead of the tag and that is to to add
extra security.

```
~/cosign-keys$ cosign sign --key cosign.key localhost:5000/rx-m-cosign:@$IMAGE_DIGEST

Enter password for private key:           <<<< type your password

	The sigstore service, hosted by sigstore a Series of LF Projects, LLC, is provided pursuant to the Hosted Project Tools Terms of Use, available at https://lfprojects.org/policies/hosted-project-tools-terms-of-use/.
	Note that if your submission includes personal data associated with this signed artifact, it will be part of an immutable record.
	This may include the email address associated with the account with which you authenticate your contractual Agreement.
	This information will be used for signing this artifact and will be stored in public transparency logs and cannot be removed later, and is subject to the Immutable Record notice at https://lfprojects.org/policies/hosted-project-tools-immutable-records/.

By typing 'y', you attest that (1) you are not submitting the personal data of any other person; and (2) you understand and agree to the statement and the Agreement terms at the URLs listed above.
Are you sure you would like to continue? [y/N] y
tlog entry created with index: 140760422
Pushing signature to: localhost:5000/rx-m-cosign

~/cosign-keys$
```

After pressing `y` our image is signed! Next we will verify its signature.


### 5. Verifying a signed image

The signed image can then be verified with `cosign`. This time we will use the `tag` and we can do that because the
`tag` is pointing to the same `digest` that we signed. To verify the image we will use our public key `cosign.pub` that
we generated earlier.

```
~/cosign-keys$ cosign verify --key cosign.pub localhost:5000/rx-m-cosign:v1

Verification for localhost:5000/rx-m-cosign:v1 --
The following checks were performed on each of these signatures:
  - The cosign claims were validated
  - Existence of the claims in the transparency log was verified offline
  - The signatures were verified against the specified public key

[{"critical":{"identity":{"docker-reference":"localhost:5000/rx-m-cosign"},"image":{"docker-manifest-digest":"sha256:44f873350dc583a833cd22a0c5056b18b7f665e5cb93c6f8af6b83206a3815e4"},"type":"cosign container image signature"},"optional":{"Bundle":{"SignedEntryTimestamp":"MEUCIQCSnR/8xODSmigXBDvRjLa9EJP6CTVe4Sm4f29Tu3IJwgIgBZAimZDXLzm2gpMJy4HYL/DCfvxpYM46tOEJqj/f/xM=","Payload":{"body":"eyJhcGlWZXJzaW9uIjoiMC4wLjEiLCJraW5kIjoiaGFzaGVkcmVrb3JkIiwic3BlYyI6eyJkYXRhIjp7Imhhc2giOnsiYWxnb3JpdGhtIjoic2hhMjU2IiwidmFsdWUiOiJmMDcwZGFjMGQ5Yzg0NTNjZTUwZTc2MGE2OTcxNDQ2ZjE1MTlkYmIzNzRhODhmNzFhOWM3ZjBmMjkxMmUxNjZkIn19LCJzaWduYXR1cmUiOnsiY29udGVudCI6Ik1FUUNJQnJ0akJvRTNDdGNaSHVnY2p2VkZ0UDFYaFJyVGp4dHpiRFM3dHNEYnRLOEFpQlRwL01nNHdKOVgrcWdUc0VuVkV0Q2Y2UGVCWnhheG05OWI2Y1lpeFdFVEE9PSIsInB1YmxpY0tleSI6eyJjb250ZW50IjoiTFMwdExTMUNSVWRKVGlCUVZVSk1TVU1nUzBWWkxTMHRMUzBLVFVacmQwVjNXVWhMYjFwSmVtb3dRMEZSV1VsTGIxcEplbW93UkVGUlkwUlJaMEZGU0VreWFqZHdUMjE2TlhwTVdtWkZlR3hpTldOU1pDdHhZalZUVVFwNlV6aHRhR3R3YVd0allXWTNUbTR5U2tkaVZXTTVOMXBoY0RSS2JEQnpOR3RRYlRkNk1uQlRhVmw1ZHpKcFkxZGtaVEp4Y25NcmRVMW5QVDBLTFMwdExTMUZUa1FnVUZWQ1RFbERJRXRGV1MwdExTMHRDZz09In19fX0=","integratedTime":1729115809,"logIndex":140760422,"logID":"c0d23d6ad406973f9559f3ba2d1ca01f84147d8ffc5b8445c224f98b9591801d"}}}}]

~/cosign-keys$
```

Awesome our image is verified!

Remember, Cosign is designed to integrate with a container registry and it doesn't directly interact with the Docker
daemon on your local machine. Hence, even for local images, a registry (even if it's a local one) is required.


### 6. Verify a public image

Let's try to verify an image which is not signed by us. For this example we will pull an image from Docker Hub and try to
verify it.

```
~/cosign-keys$ cosign verify --key cosign.pub docker.io/library/alpine:latest

Error: no matching signatures
main.go:69: error during command execution: no matching signatures

~/cosign-keys$
```

That's strange, assuming we can verify any image--so what happened?

In order to verify a container image using a public key, it needs to be signed with a corresponding private key
beforehand. Only the person/entity that signed the image (i.e., the owner of the private key) can provide a key to
verify it.

The `alpine:latest` image has not been signed with the private key corresponding to your `cosign.pub` file. You can only
successfully verify images that have been signed with your private key.

As of now, most images on Docker Hub are not signed with Cosign. In practice, you would use Cosign to sign your own
images (or use images from trusted sources that also use Cosign), and then you would be able to verify those images with
their corresponding public keys.


### 7. Food for thought: real-world examples

- Kubernetes client, server and source tarballs, binary artifacts, Software Bills of Material (SBOMs) as well as the
  build provenance are signed using Cosign. More in
  [Kubernetes 1.26 release artifact signing](https://kubernetes.io/blog/2022/12/12/kubernetes-release-artifact-signing/)

- In an Enterprise Environment: Companies can use Cosign to ensure that only approved and properly signed images are
  deployed in their environments. This could be enforced at the CI/CD pipeline level or with Kubernetes Admission
  Control, refusing to deploy images that don't pass the Cosign verification process.

- Open Source Projects: Open source maintainers can sign their Docker images using Cosign, allowing users to verify
  the source and integrity of images before using them.

- Supply Chain Security: By integrating Cosign into a software supply chain, companies can ensure that each step
  (code, build, and deployment) is signed and verifiable. This provides a higher degree of trust and can help prevent
  supply chain attacks.


### 8. Clean up

Delete your containers:

```
~/cosign-keys$ sudo docker container rm --force $(sudo docker container ls -aq)

23045e3288d8
aee2e75568f4

~/cosign-keys$
```


## END OF LAB 2 - STOP HERE

<br>

## Lab 3 - Software Supply Chain Security: In-Toto

A software supply chain is the series of steps performed when writing, testing, packaging, and distributing software. A
typical software supply chain is composed of multiple steps (aka. links) that transform or verify the state of the
project in order to drive it to a release.

Supply chain security is crucial to the overall security of a software product. An attacker who is able to control a
step in the supply chain can introduce back doors in the source code, include vulnerable libraries and compromise
security in many other ways that affect the final product. Many frameworks exist to ensure security in the “last mile”
(e.g., software updaters), however they may be providing integrity and authentication to a product that is already
vulnerable if the supply chain was compromised.

The in-toto project is designed to ensure the integrity of a software product from initiation to end-user installation.
It does so by transparently disclosing the steps performed, by whom, and in what order. As a result, with some guidance
from the group creating the software, in-toto allows the user to verify that each required step in the supply chain was
performed by the right actor and that the artifacts the user is preparing to run are the result of that supply chain.

The in-toto project is managed by the Secure Systems Lab at NYU and the NJIT Cybersecurity Research Center and was
originally supported by the US Defense Advanced Research Projects Agency (DARPA) and the Air Force Research Laboratory
(AFRL).

In this lab we will create a simple supply chain and secure it with in-toto!


### 1. Install in-toto

The in-toto project is Python based so we will need to install the Python package manager, pip. Pip can be installed
using the system's package manager:

```
~$ sudo apt update && sudo apt install python3-pip -y

...

Processing triggers for libc-bin (2.39-0ubuntu8.3) ...
Processing triggers for man-db (2.12.0-4build2) ...
Processing triggers for sgml-base (1.31) ...
Setting up libfontconfig1:amd64 (2.15.0-1.1ubuntu2) ...
Setting up libgd3:amd64 (2.3.3-9ubuntu5) ...
Setting up libc-devtools (2.39-0ubuntu8.3) ...
Processing triggers for libc-bin (2.39-0ubuntu8.3) ...
Scanning processes...                                                                                                                                   
Scanning candidates...                                                                                                                                  
Scanning linux images...                                                                                                                                

Running kernel seems to be up-to-date.

Restarting services...

Service restarts being deferred:
 systemctl restart unattended-upgrades.service

No containers need to be restarted.

No user sessions are running outdated binaries.

No VM guests are running outdated hypervisor (qemu) binaries on this host.

~$
```

On Ubuntu systems, the Python 3 package manager is called pip3; with pip3 installed we can use it to install in-toto
from the public Python package.

The `sudo` command below runs the installation as root, required so that we can update packages in the protected part of
the system's directory structure. The `-H` switch causes the command to run in the home directory of the root user. This
is important when commands write files to the current directory, otherwise temporary files owned by root could get
created in your user directory.

```
~$ sudo -H pip3 install --break-system-packages in-toto

...

Installing collected packages: securesystemslib, python-dateutil, pathspec, iso8601, in-toto
Successfully installed in-toto-3.0.0 iso8601-2.1.0 pathspec-0.12.1 python-dateutil-2.9.0.post0 securesystemslib-1.1.0
WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager. It is recommended to use a virtual environment instead: https://pip.pypa.io/warnings/venv

~$
```

> N.B. Modern OS versions installing Python from system packages will not install other Python Packages using
> pip (or pip3) as this could break the OS packages. The alternative is to use the `--break-system-packages`
> switch or install the package within a Python virtual environment (recommended for experienced Python devs).

For our purposes, you can ignore the warnings. As long as in-toto reports successfully installed you are set!

in-toto provides various command line tools that you can use to generate, consume, modify and verify in-toto metadata.
List what was installed:

```
~$ ls -l /usr/local/bin/in-toto*

-rwxr-xr-x 1 root root 229 Oct 16 22:15 /usr/local/bin/in-toto-match-products
-rwxr-xr-x 1 root root 219 Oct 16 22:15 /usr/local/bin/in-toto-mock
-rwxr-xr-x 1 root root 221 Oct 16 22:15 /usr/local/bin/in-toto-record
-rwxr-xr-x 1 root root 218 Oct 16 22:15 /usr/local/bin/in-toto-run
-rwxr-xr-x 1 root root 219 Oct 16 22:15 /usr/local/bin/in-toto-sign
-rwxr-xr-x 1 root root 221 Oct 16 22:15 /usr/local/bin/in-toto-verify

~$
```

The installed command line tools include:

- `in-toto-match-products` - check if local artifacts match products in passed link
- `in-toto-mock` - variant of `in-toto-run` useful for trying out how to generate a link without the need for a key
- `in-toto-record` - creates a signed link metadata file in two steps, in order to provide evidence for supply chain
  steps that cannot be carried out by a single command (when `in-toto-run` isn't sufficient)
- `in-toto-run` - main command line interface for generating link metadata while carrying out a supply chain step
- `in-toto-sign` - sign in-toto link or layout metadata
- `in-toto-verify` - main verification tool of the suite used to verify that the software supply chain of the delivered
  product was carried out as defined in the passed in-toto supply chain layout

We will use a number of these in this lab.


### 2. Creating functionaries

Imagine that we use the following tools in our software supply chain:

- git - for source code control
- go build - to build the service
- go vet - static analysis
- docker - container build

We can use in-toto to create attestations about each of these steps. However, before you should trust an attestation you
should be sure that you can prove the identity of the party making the attestation. For this reason in-toto defines
"functionaries". A functionary is an authorized person or program performing a supply chain step.

For example, if we created a build pipeline with _exclusive access_ to a key pair called "app-build" we could use this
key pair to sign the results of the step. This would allow users to verify that the step was completed, that the
artifacts produced are not tampered with and that the guarantee of these things is coming from the functionary we trust
(app-build).

In a real system you will have distinct functionaries for each stage of the process or for each software tool in the
process (e.g. GitLab, Jenkins, Tekton, etc.). Individuals can also have keys and can use them to sign attestations like,
"I reviewed the code and LGTM", etc.

In-toto requires that signing keys are in a standard PKCS8/PEM format. GPG keys are typically in OpenPGP format, so we
cannot use them without complicated conversions; instead, we will use OpenSSL to generate a key pair for our "app-build"
functionary:

```
~$ mkdir ~/in-toto ; cd ~/in-toto/

~/in-toto$ openssl genpkey -algorithm rsa -out app-build.pem                # Generate private key

~/in-toto$ openssl rsa -in app-build.pem -pubout -out app-build-pub.pem     # Generate public key

~/in-toto$ ls -l

total 8
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 21:52 app-build-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 21:52 app-build.pem

~/in-toto$
```

Great our public key and private key are on disk. In a real world setting we would probably remove write permission from
both keys and make the private key exclusively readable by the program that will run the build steps.


### 3. Creating attestations for supply chains steps

To execute our first step we can use `in-toto-run` to execute the `git clone` command. The `in-toto-run` tool will run the
designated command and generate a signed link file, allowing users to verify that the command was completed by the
functionary, identified by our gpg key.

If necessary, reestablish your `GITDADDR` variable:

```
~/in-toto$ export GITDADDR=$(sudo docker container inspect -f '{{ .NetworkSettings.IPAddress }}' git-daemon) && echo $GITDADDR

172.17.0.2

~/in-toto$
```

Try cloning your hello-world repo from Git Daemon (you will be asked for the passphrase of your gpg key):

```
~/in-toto$ in-toto-run --step-name vcs-1 --signing-key app-build.pem -- git clone git://$GITDADDR/hello-world.git

~/in-toto$
```

Now take a look at the link file generated:

```
~/in-toto$ ls -l

total 16
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 21:52 app-build-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 21:52 app-build.pem
drwxrwxr-x 3 ubuntu ubuntu 4096 Oct 17 21:59 hello-world
-rw-rw-r-- 1 ubuntu ubuntu  906 Oct 17 21:59 vcs-1.3ac5bb80.link

~/in-toto$ cat vcs-1*.link
```
```json
{
 "signatures": [
  {
   "keyid": "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea",
   "sig": "416f76ed7e204c82ae2d50dfdd4ee34045dee1529e27b38995ba7e12a666d1a859577c9025e3b89a6f311a8e810c20a6dfa1901c2500d8bff05b083d12608b3b8153536dd40cdc177eb8cda8a2d709d596f438c0b308fdd3d33a5634e93b7b1d39e0d7c3cb829fcaa5632878269cb85b0ccd341ec513fb200dc4d0a1249dc25b380c05434ee16926fd09ed48a86ca001eea2b0aa3483c00effaba8de732f3cd7bdb01ed41189c98f390baf075cebd57879a07ea75c6158431baba20170ec4c7111b639c8a7385b014cd74d7c761ee23cc07c3ee92992c313eea18a6411bfea614c165a546e92267f47e35a0737d24b1a58674d7b96d9da946516def98087708d"
  }
 ],
 "signed": {
  "_type": "link",
  "byproducts": {
   "return-value": 0,
   "stderr": "",
   "stdout": ""
  },
  "command": [
   "git",
   "clone",
   "git://172.17.0.2/hello-world.git"
  ],
  "environment": {},
  "materials": {},
  "name": "vcs-1",
  "products": {}
 }
}
```
```
~/in-toto$
```

Here is what happened behind the scenes:

- in-toto wraps the git clone command
- it hashes the contents of the source code
- then it adds the hash together with other information to a metadata file
- it signs the metadata with our private key using the default gpg key ID (because we don't have more than one)

Link files have a name of the format `<step name>.<functionary keyid prefix>.link` and include the following fields:

- `signatures`: a list of signature blocks and keys
- `signed`: the results of the process being attested (program's stdout/stderr and return code)
- `command`: the program executed (if any)
- `environment`: the execution environment
- `materials`: files used in the execution (SHA hashes of)
- `name`: the name of the step (link in the chain)
- `products`: files produced by the execution (SHA hashes of)

Our version control link file tells us, without doubt, that our functionary ran the command `git clone ...`. Sometimes
that is all you need. Often however we want to know what files were involved and what their hash codes were. Perhaps we
want to know what the output of the command was. We can enrich the link file with lots of additional information.

For example:

- `--record-streams`  will capture the output of the command executed (stdout and stderr)
- `--materials`  can capture the hash codes of input files **before** the command is run
- `--products` can capture the hash codes of output files **after** the command is run

We'll run the next step, the build, with all of these settings. We will run the build in a container and it may take a
few seconds. The `in-toto-run` command will timeout after 10 seconds if we do not increase the timeout setting. Change
the timeout to 180 seconds and build the software:

```
~/in-toto$ in-toto-run --signing-key app-build.pem \
--step-name build-1 \
--run-timeout 180 \
--materials ./hello-world \
--products ./hello-world/release/linux/amd64/ \
--record-streams \
-- sudo docker container run -v ~/in-toto/hello-world:/app docker.io/golang:1.23 sh -c \
'cd /app; go mod init rx-m.com/hw; go mod tidy; CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -buildvcs=false -v -a -o release/linux/amd64/hello-world'

Unable to find image 'golang:1.23' locally
                                          1.23: Pulling from library/golang

...

~/in-toto$
```

The "`docker container run`" command here runs a go language container with our trash-levels directory mounted inside
and then executes the "`go build`" command. This gives us a repeatable Go environment to use. In this example we create
a new go module for our program though normally the go module would be checked into source control and used to lock down
version dependencies.

Examine the link file:

```
~/in-toto$ ls -l

total 24
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 21:52 app-build-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 21:52 app-build.pem
-rw-rw-r-- 1 ubuntu ubuntu 4249 Oct 17 22:26 build-1.3ac5bb80.link
drwxrwxr-x 4 ubuntu ubuntu 4096 Oct 17 22:26 hello-world
-rw-rw-r-- 1 ubuntu ubuntu  906 Oct 17 21:59 vcs-1.3ac5bb80.link

~/in-toto$ cat build-1*.link
```
```json
{
 "signatures": [
  {
   "keyid": "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea",
   "sig": "051fd01f8899744b2ba6749a49f00952a4f0dc5fcb53e086d6e71b1f309e64c70e49ce0a72b6bffe6bbf06464c9f729ac5e705c47f7e86a8864a75d97016895ab415687416942103725cb619a92409d98638a1ed5dde360bd7b22563f9bd1cbaf7e4db3404277e1d0757eba11eed8e89335d6b5022500c79d41e25e6249c72704ce5b51d2469fd785da41b03f240404b31131704e7a10329dc77ca534bf941ff6ba2a6a4c11a68d7888c698e64cd356fced2ffe3cd85a1a82f90e3439607328374f3cdaff7f9dc75d0eceb1e87e9f4779721786576462f2ebef1ed23d6a7a3d1733c088ff57ee42196f77df997c837fa8041337f4fe8e6ad4b38bfa71bc2eeea"
  }
 ],
 "signed": {
  "_type": "link",
  "byproducts": {
   "return-value": 0,
   "stderr": "go: creating new go.mod: module rx-m.com/hw\ngo: to add module requirements and sums:\n\tgo mod tidy\ninternal/unsafeheader\ninternal/goarch\ninternal/cpu\ninternal/abi\ninternal/bytealg\ninternal/byteorder\ninternal/chacha8rand\ninternal/coverage/rtcov\ninternal/godebugs\ninternal/goexperiment\ninternal/goos\ninternal/profilerecord\ninternal/runtime/atomic\ninternal/runtime/syscall\ninternal/stringslite\ninternal/runtime/exithook\nruntime/internal/math\nruntime/internal/sys\ncmp\ninternal/itoa\nruntime\ninternal/race\nmath/bits\nmath\nunicode/utf8\nsync/atomic\nunicode\ninternal/asan\ninternal/msan\ncontainer/list\ncrypto/internal/alias\ncrypto/subtle\ncrypto/internal/boring/sig\nunicode/utf16\nvendor/golang.org/x/crypto/cryptobyte/asn1\nvendor/golang.org/x/crypto/internal/alias\ninternal/nettrace\nlog/internal\niter\ninternal/reflectlite\nsync\nslices\ninternal/bisect\nerrors\nstrconv\nio\ninternal/oserror\npath\nreflect\ninternal/godebug\nsyscall\ntime\ninternal/fmtsort\nio/fs\ninternal/syscall/unix\ninternal/filepathlite\ninternal/poll\ninternal/syscall/execenv\ninternal/testlog\nbytes\nos\nstrings\nbufio\nsort\nfmt\nencoding/binary\nhash\nhash/crc32\ncontext\ncrypto\ncrypto/cipher\ncompress/flate\ncrypto/internal/boring\ncrypto/internal/randutil\nmath/rand\ncompress/gzip\nmath/big\ncrypto/aes\ncrypto/des\ncrypto/internal/edwards25519/field\ncrypto/internal/nistec/fiat\ncrypto/rand\nembed\ncrypto/internal/bigmod\ncrypto/internal/nistec\ncrypto/internal/boring/bbig\ncrypto/sha512\nencoding/asn1\ncrypto/ecdh\ncrypto/elliptic\nvendor/golang.org/x/crypto/cryptobyte\ncrypto/internal/edwards25519\ncrypto/ecdsa\ncrypto/ed25519\ncrypto/hmac\nvendor/golang.org/x/crypto/chacha20\nvendor/golang.org/x/crypto/internal/poly1305\nvendor/golang.org/x/sys/cpu\nvendor/golang.org/x/crypto/hkdf\ncrypto/md5\nvendor/golang.org/x/crypto/chacha20poly1305\nvendor/golang.org/x/crypto/sha3\ncrypto/internal/hpke\ncrypto/internal/mlkem768\ncrypto/rc4\ncrypto/rsa\ncrypto/sha1\ncrypto/sha256\ncrypto/dsa\nencoding/hex\nencoding/base64\ncrypto/x509/pkix\nvendor/golang.org/x/net/dns/dnsmessage\nencoding/pem\ninternal/singleflight\nmath/rand/v2\ninternal/concurrent\ninternal/weak\nunique\nnet/url\nnet/netip\npath/filepath\nvendor/golang.org/x/text/transform\nlog\nnet\nvendor/golang.org/x/text/unicode/bidi\nvendor/golang.org/x/text/secure/bidirule\nvendor/golang.org/x/text/unicode/norm\nvendor/golang.org/x/net/idna\nvendor/golang.org/x/net/http2/hpack\nmaps\nmime\nmime/quotedprintable\ncrypto/x509\nnet/textproto\nvendor/golang.org/x/net/http/httpguts\nvendor/golang.org/x/net/http/httpproxy\nmime/multipart\nnet/http/internal\nnet/http/internal/ascii\ncrypto/tls\nnet/http/httptrace\nnet/http\nrx-m.com/hw\n",
   "stdout": ""
  },
  "command": [
   "sudo",
   "docker",
   "container",
   "run",
   "-v",
   "/home/ubuntu/in-toto/hello-world:/app",
   "docker.io/golang:1.23",
   "sh",
   "-c",
   "cd /app; go mod init rx-m.com/hw; go mod tidy; CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -buildvcs=false -v -a -o release/linux/amd64/hello-world"
  ],
  "environment": {},
  "materials": {
   "hello-world/README.md": {
    "sha256": "5ebf6fc735f0d9032701213d37d82b3d41c8854f1bf2df13501f56e55329181e"
   },
   "hello-world/main.go": {
    "sha256": "51895820b41d75c6b8e8cc447aef6ce908f6abb446259f4beea8875dde97a767"
   }
  },
  "name": "build-1",
  "products": {
   "hello-world/release/linux/amd64/hello-world": {
    "sha256": "45c1579d48c3290f2b9775b65838825ccde0577a5d2231fc0433d688d005187b"
   }
  }
 }
}
```
```
~/in-toto$
```

As you can see we now have not only the build command but the output of the build stage captured. We also have the SHA
hashes of all of the input files and the hash of the executable produced. This entire link file is signed with our
private key and verifiable with the public key.

We can add as many links as we see fit to our supply chain. However with our two above links created we can try creating
a chain, known as a layout to in-toto, whereupon we can verify and sign the entire supply chain process.


### 4. Chaining the links

Now that we have a few link files created we can sign the overall supply chain. When using in-toto, a JSON-formatted
layout file is used to define the stages of your supply chain. In this step we will create a layout that requires just
the vcs step to be completed and signed.

When creating the `root.layout` exemplified below, _be sure to change the key information on the following lines to
match that generated for the key `keyid` in your vcs-1 step, do NOT use the key information from the example_:

- `signed.steps.pubkeys`
- `signed.keys`
- `signed.keys.keyid`

Get the value for `keyid` from your vcs-1 step using `jq` (install `jq` first if not installed already):

```
~/in-toto$ sudo apt update && sudo apt install jq -y

...

~/in-toto$ cat vcs-1*.link | jq '.signatures[].keyid'

"3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea"

~/in-toto$
```

We will need to provide the public key information from `app-build-pub.pem` at `signed.keys.keyval.public` in the
in-toto layout but _it needs to be a single line with no spaces and with `\n` characters in place of the newlines_ in
the file. Here is an example you can run to get the key material in the right format:

```
# The format in the file:
~/in-toto$ cat app-build-pub.pem

-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzVv3w9AIei8YybKBjlna
uyjHSBsdmBrvsaOrE8FC9Ub6d4x6S/5S8PwgJsNtIyvIXfS7jT2D3A4I7XLyo06k
OGzGNvYSBHDqdBqhx+xpjOsmPsBprBCgRYHV4ZRxjGVtZ+vR+u3KJUBDEUxLdhNS
ri/8Vt3T093Z3SFKM0FhydE7lRXFQcH8QONDAg0PsmJgDclH3uC73KuJEmBrHZtI
XhaAsKnQmSfLaATU6cJQ4lYOZ6rvk9k4knReAWqJEJgyAvEaF+huKBZEMSTjgprI
UkFXvqJkI5hHbn9Q1uRh1PyvgGee0HXW/q0rjokbw0g0stPJaEkIA8YQwC9P8U5C
fwIDAQAB
-----END PUBLIC KEY-----

# The format you need in the layout:
~/in-toto$ cat app-build-pub.pem | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//'; echo

-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzVv3w9AIei8YybKBjlna\nuyjHSBsdmBrvsaOrE8FC9Ub6d4x6S/5S8PwgJsNtIyvIXfS7jT2D3A4I7XLyo06k\nOGzGNvYSBHDqdBqhx+xpjOsmPsBprBCgRYHV4ZRxjGVtZ+vR+u3KJUBDEUxLdhNS\nri/8Vt3T093Z3SFKM0FhydE7lRXFQcH8QONDAg0PsmJgDclH3uC73KuJEmBrHZtI\nXhaAsKnQmSfLaATU6cJQ4lYOZ6rvk9k4knReAWqJEJgyAvEaF+huKBZEMSTjgprI\nUkFXvqJkI5hHbn9Q1uRh1PyvgGee0HXW/q0rjokbw0g0stPJaEkIA8YQwC9P8U5C\nfwIDAQAB\n-----END PUBLIC KEY-----

~/in-toto$
```

Create the following layout file making sure to:

- Put the value returned by the `cat vcs-1*.link | jq '.signatures[].keyid'` command in for the example values of:
  - `signed.steps[0].pubkeys`
  - `signed.keys`
  - `signed.keys.<ID>.keyid`
- Put the properly formatted public key material in `signed.keys.<ID>.keyval.public`

```
~/in-toto$ nano root.layout && cat root.layout
```
```json
{
  "signatures": [],
  "signed": {
    "_type": "layout",
    "expires": "2030-01-01T01:01:00Z",
    "readme": "Hello world supply chain",
    "steps": [{
      "_type": "step",
      "name": "vcs-1",
      "expected_materials": [],
      "expected_products": [],
      "pubkeys": ["3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea"],
      "expected_command": ["git","clone","git://172.17.0.2/hello-world.git"],
      "threshold": 1
    }],
    "inspect": [],
    "keys": {
      "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea": {
        "keyid": "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea",
        "keytype": "rsa",
        "keyval": {
          "public": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzVv3w9AIei8YybKBjlna\nuyjHSBsdmBrvsaOrE8FC9Ub6d4x6S/5S8PwgJsNtIyvIXfS7jT2D3A4I7XLyo06k\nOGzGNvYSBHDqdBqhx+xpjOsmPsBprBCgRYHV4ZRxjGVtZ+vR+u3KJUBDEUxLdhNS\nri/8Vt3T093Z3SFKM0FhydE7lRXFQcH8QONDAg0PsmJgDclH3uC73KuJEmBrHZtI\nXhaAsKnQmSfLaATU6cJQ4lYOZ6rvk9k4knReAWqJEJgyAvEaF+huKBZEMSTjgprI\nUkFXvqJkI5hHbn9Q1uRh1PyvgGee0HXW/q0rjokbw0g0stPJaEkIA8YQwC9P8U5C\nfwIDAQAB\n-----END PUBLIC KEY-----"
        },
        "scheme": "rsassa-pss-sha256"
      }
    }
  }
}
```
```
~/in-toto$
```

This layout file contains two top level keys:

- signatures: this is where the signatures will go when we sign the file with the layout private key
- signed: this is the layout body we want signed

The `signed` section includes the following fields for signing:

- `_type`: always "layout"
- `expires`: freshness requires that we only commit to these attestations for a defined period
- `readme`: arbitrary descriptive information
- `steps`: a list of the steps to verify
- `inspect`: a list of optional inspections to make (e.g. verifying binary executable SHA hashes)
- `keys`: this is the list of functionary keys we allow (keyid and public key components are needed)

Each step includes the following keys:

- `_type`: always "step"
- `name`: the step name
- `expected_materials`: expected input files
- `expected_products`: expected output files
- `pubkeys`: public keys to use when verifying functionary signatures
- `expected_command`: commands expected to be run
- `threshold`: the number of functionary signatures required

In this first cut we supply only the vcs step. We can add more steps and inspections later. While we could verify
expected products, materials and more in each step, we'll start by simply verifying the fact that the git clone command
we want was run.

To sign this layout we need to use a _different key from the keys used for the various link steps_. This is a
manifestation of the two person rule. Several parties can be required to run and sign each step, while another party
verifies the entire process. This way if any one functionary key is compromised, we can still ensure a secure supply
chain.

Create a new key set to use when signing the layout file:

```
~/in-toto$ openssl genpkey -algorithm rsa -out chain-root.pem                 # Generate private key

~/in-toto$ openssl rsa -in chain-root.pem -pubout -out chain-root-pub.pem     # Generate public key

~/in-toto$ ls -l

total 36
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 21:52 app-build-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 21:52 app-build.pem
-rw-rw-r-- 1 ubuntu ubuntu 4249 Oct 17 22:26 build-1.3ac5bb80.link
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 22:48 chain-root-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 22:48 chain-root.pem
drwxrwxr-x 4 ubuntu ubuntu 4096 Oct 17 22:26 hello-world
-rw-rw-r-- 1 ubuntu ubuntu 1249 Oct 17 22:46 root.layout
-rw-rw-r-- 1 ubuntu ubuntu  906 Oct 17 21:59 vcs-1.3ac5bb80.link

~/in-toto$
```

Sign the layout using `in-toto-sign`:

```
~/in-toto$ in-toto-sign -f root.layout --key chain-root.pem -o root.layout.sig

~/in-toto$
```

Examine the signed layout:

```
~/in-toto$ cat root.layout.sig
```
```json
{
 "signatures": [
  {
   "keyid": "b0a632ab159bb27aa981be5e28f55664a144ecb15ef71d73a26370faead97eb5",
   "sig": "ab4f571b01f7a349e18ac9dd32b769a8b9d67a83f2507f0f643f6dfc3392600d15fab2851a07a9c119b181ff725a0776472ff0ac6a0564be94e9e54549cf5452384495b41f3a7689cc83693db506b66ca2e54d632bc970f6e8d5a3ae2351bb8c0e2ceb1ca8104a569b86d32f68ed5a25a78d7041dfe974b5a2237ca54806c8fcb8696b042be94edaad4d48c9a8e699d0268e37bd28449b9d4a2c94fde876da06afcbe2d085c8681d7989ad685b907e4d483754a308983816c809309eb66864ada6e99508cff4731e365bf085c25bfb4a3c5ce6c657b42df625d460428d29e13ef1cde6a6eb5babcdcb426c484534372cf357b7c005a5d066b0c24278a6ca646c"
  }
 ],
 "signed": {
  "_type": "layout",
  "expires": "2030-01-01T01:01:00Z",
  "inspect": [],
  "keys": {
   "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea": {
    "keyid": "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea",
    "keytype": "rsa",
    "keyval": {
     "public": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzVv3w9AIei8YybKBjlna\nuyjHSBsdmBrvsaOrE8FC9Ub6d4x6S/5S8PwgJsNtIyvIXfS7jT2D3A4I7XLyo06k\nOGzGNvYSBHDqdBqhx+xpjOsmPsBprBCgRYHV4ZRxjGVtZ+vR+u3KJUBDEUxLdhNS\nri/8Vt3T093Z3SFKM0FhydE7lRXFQcH8QONDAg0PsmJgDclH3uC73KuJEmBrHZtI\nXhaAsKnQmSfLaATU6cJQ4lYOZ6rvk9k4knReAWqJEJgyAvEaF+huKBZEMSTjgprI\nUkFXvqJkI5hHbn9Q1uRh1PyvgGee0HXW/q0rjokbw0g0stPJaEkIA8YQwC9P8U5C\nfwIDAQAB\n-----END PUBLIC KEY-----"
    },
    "scheme": "rsassa-pss-sha256"
   }
  },
  "readme": "Hello world supply chain",
  "steps": [
   {
    "_type": "step",
    "expected_command": [
     "git",
     "clone",
     "git://172.17.0.2/hello-world.git"
    ],
    "expected_materials": [],
    "expected_products": [],
    "name": "vcs-1",
    "pubkeys": [
     "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea"
    ],
    "threshold": 1
   }
  ]
 }
}
```
```
~/in-toto$
```

The metadata is the same but it now includes a signature block attesting that this is indeed our supply chain, defining
the steps, commands executed and more.


### 5. Verifying the chain

Now that we have a layout that defines our steps and order (one step so far), we can verify the supply chain.
Imagine our client (or a k8s admission controller) wants to know for sure that our supply chain can be trusted before
deploying our software. To make this possible we could distribute a tarball with the signed links and layout metadata,
whereupon the client could then use the root public key to verify the layout integrity and its requirements for
each of the links, including the SHA of the built container image(s), distributable tarball or what have you.

For example, if our supply chain admission controller is asked to verify a Pod using image `rxmllc/trash-levels:1.1.1`
we could verify that the `s3:/supply-chain-meta/rxmllc/trash-levels:1.1.1/root.layout` is valid (using the root public
key) and that the container image gpg key matches the layout expected_products gpg file for the image build step.

To see how this works, verify your signed layout with `in-toto-verify`:

```
~/in-toto$ in-toto-verify --layout root.layout.sig --verification-keys chain-root-pub.pem -v

Loading layout...
Verifying layout metadata signatures...
Extracting layout from metadata...
Verifying layout expiration...
Reading link metadata files...
Verifying link metadata signatures...
Verifying sublayouts...
Verifying alignment of reported commands...
Verifying command alignment for 'vcs-1.3ac5bb80.link'...
Verifying threshold constraints...
Skipping threshold verification for step 'vcs-1' with threshold '1'...
Verifying Step rules...
Verifying material rules for 'vcs-1'...
Verifying product rules for 'vcs-1'...
Executing Inspection commands...
Verifying Inspection rules...
The software product passed all verification.

~/in-toto$
```

The supply chain is intact! We can attest that:

- All of the steps were completed
- The commands we want to see run were executed
- The functionaries we authorize attest to each of the steps required


### 6. Attack the supply chain

Supply chains can fall prey to a wide range of attacks. Should an adversary compromise any aspect of the supply chain
we will have grave concerns:

- Developer desktop: adversary can commit dangerous code as the developer
- Source code control system: adversary can inject dangerous code or tag unauthorized branches
- Build system: adversary can inject compromised libraries or sign bad builds
- Test environment: adversary can pass infected or crippled code
- Packaging: adversary can package (containerize) and sign anything

Let's see how in-toto can help us here.

First let's try something simple. Our protected step requires us to clone the hello-world repo, let's try cloning a
different repository:

```
~/in-toto$ in-toto-run --step-name vcs-1 --signing-key app-build.pem -- git clone https://github.com/rx-m/hostinfo

~/in-toto$ ls -l

total 44
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 21:52 app-build-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 21:52 app-build.pem
-rw-rw-r-- 1 ubuntu ubuntu 4249 Oct 17 22:26 build-1.3ac5bb80.link
-rw-rw-r-- 1 ubuntu ubuntu  451 Oct 17 22:48 chain-root-pub.pem
-rw------- 1 ubuntu ubuntu 1704 Oct 17 22:48 chain-root.pem
drwxrwxr-x 4 ubuntu ubuntu 4096 Oct 17 22:26 hello-world
drwxrwxr-x 5 ubuntu ubuntu 4096 Oct 18 02:13 hostinfo
-rw-rw-r-- 1 ubuntu ubuntu 1249 Oct 17 22:50 root.layout
-rw-rw-r-- 1 ubuntu ubuntu 1841 Oct 17 22:50 root.layout.sig
-rw-rw-r-- 1 ubuntu ubuntu  906 Oct 18 02:13 vcs-1.3ac5bb80.link

~/in-toto$
```

As a bad actor, we have used the stolen `app-build.pem` key to sign the vcs-1 link with our dangerous repo cloned
(hostinfo). Let's see what in-toto thinks about our supply chain now:

```
~/in-toto$ in-toto-verify --layout root.layout.sig --verification-keys chain-root-pub.pem -v

...

Run command '['git', 'clone', 'https://github.com/rx-m/hostinfo']' differs from expected command '['git', 'clone', 'git://172.17.0.2/hello-world.git']'

...

~/in-toto$
```

Our supply chain layout says hello-world must be cloned. In-toto thus complains when is sees the vcs link file signing
the git clone of the hostinfo repo.

Let's try another approach. Edit the vcs link file to show that hello-world _was cloned_ by editing line 18:

```
~/in-toto$ nano vcs-1.*.link && cat vcs-1.*.link
```
```json
{
 "signatures": [
  {
   "keyid": "3ac5bb8023b595dd03495af020a0fc61ee056897d97166900d7d5233883ed5ea",
   "sig": "64ae80d8141409d6322d73e22f59dc30f9708f55f0d72542d328fffada055adbcfc885a0d45850e787040b98296fe20178337e4f63dbb82f658d5a000738f4faed40b7db5ea9dbe8661dee08a091c9868cd7b3327c58373fdca64d502dcccc59bc79d7bf804a91bf02149958390120561756ded118f872f962497ae0900e50cdc26d4220a8b82b7e5e156452bca3c2b37c1f205b0603eb28377984eb93d1c5279555b4203ec56d0a898f3b9c3caf0d1470271e81dfbc1cb3fc81b9ef09b034ddf8a49b323a458e96df492c62dbab406376b51d73f1a674757842d88f7c3f0d0411035093fd5e94485d62e8ee10a023550cd891a35a1cffef3d9e839ea1705781"
  }
 ],
 "signed": {
  "_type": "link",
  "byproducts": {
   "return-value": 0,
   "stderr": "",
   "stdout": ""
  },
  "command": [
   "git",
   "clone",
   "git://172.17.0.2/hello-world.git"
  ],
  "environment": {},
  "materials": {},
  "name": "vcs-1",
  "products": {}
 }
}
```
```
~/in-toto$
```

Now try to verify the supply chain:

```
~/in-toto$ in-toto-verify --layout root.layout.sig --verification-keys chain-root-pub.pem -v

(in-toto-verify) ThresholdVerificationError: Step 'vcs-1' requires at least '1' links validly signed by different authorized functionaries. Only found '0'

~/in-toto$
```

Because the link attestation is signed any tampering with the file contents will cause in-toto to reject the link. You
may have noticed the `"threshold": 1` setting in the layout file, this defines the number of link signatures a step
requires to pass. This gives us the ability to require multiple functionaries to sign off on a link before accepting it.

In-toto can do much more of course. You can verify that the outputs of one step (the products) are used as the inputs of
the next step (the materials). This helps secure the integrity of the chain from step to step.

Tools like The Update Framework [TUF] (https://theupdateframework.io/) can be used to distribute artifacts and signed
metatdata. Tools like Grafeas (https://grafeas.io/) can be used to securely host link and layout metadata
(https://github.com/in-toto/totoify-grafeas).

<br>

Congratulations you have completed the labs!

<br>

_Copyright (c) 2024 RX-M LLC, Cloud Native & AI Consulting, all rights reserved_