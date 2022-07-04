import { ethers } from 'ethers'
import router, { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import jwtDecode from 'jwt-decode';
import { useEffect, useState } from 'react'
import Fortmatic from "fortmatic";
import WalletConnectProvider from "@walletconnect/web3-provider";

const BACKEND = 'http://localhost:8000/api'

const LS_KEY = 'pic-metamask:auth';


export default function Home() {
  //const [formInput, updateFormInput] = useState({ name: '', email: ''})
  //const [signature, setSignature] = useState('')
  //const [signer, setSigner] = useState(null)
  //const router = useRouter()
  const [acount, setAcount] = useState('')
  const [loading, setLoading] = useState(true)
  const [setted, setSetted] = useState(false)
  const [authstate, setAuthstate] = useState({});
	const [state, setState] = useState({
		id: '',
    publicAddress:'',
		username: '',
		email: '',
	});

	useEffect(() => {
    initInfo()
	}, []);

  
	useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      //console.log(router.asPath)
      if(router.asPath == '/my-acount'){
        initInfo()
      }
    })
	}, []);
  

	const handleLoggedIn = (auth) => {
		localStorage.setItem(LS_KEY, JSON.stringify(auth));
		setAuthstate(auth);
	};

  // not used
  async function sign() {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()
    //const xs = await signer.signMessage("hello")
    ////console.log(`signature is ${xs}`)
    const domain = {
      name: 'Ether Mail',
      version: '1',
      chainId: 4,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
    };
    
    // The named list of all type definitions
    const types = {
        Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' }
        ],
        Mail: [
            { name: 'from', type: 'Person' },
            { name: 'to', type: 'Person' },
            { name: 'contents', type: 'string' }
        ]
    };
    
    // The data to sign
    const value = {
        from: {
            name: 'Cow',
            wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
        },
        to: {
            name: 'Bob',
            wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
        },
        contents: 'Hello, Bob!'
    };
    
    const signature = await signer._signTypedData(domain, types, value);
    //console.log(`signature is ${signature}`)
  }

  const handleSignup = async (publicAddress) => {
    //console.log(publicAddress)
    const r = await fetch(`${BACKEND}/users`, {
      body: JSON.stringify({ publicAddress }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    
    //console.log(r)
    const data = await r.json()
    return data
  }


	const handleSignMessage = async ({
		publicAddress,
		nonce,
	}) => {
    //console.log({publicAddress,nonce})
		try {
      const web3Modal = new Web3Modal({
        network: "rinkeby",
        cacheProvider: true,
      });
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)    
      const signer = provider.getSigner()
      //const curAcounttmp = await signer.getAddress();
      //console.log(`----> ${curAcounttmp}`)
      //const message = 'Welcome to PIC NFT market.\n' + 'One-time nonce: ' + nonce;
      const message = `Welcome to Pictures NFT market made by WeiLi, JIKEN member.\nNonce: ${nonce}`
      //console.log(message)
			const signature = await signer.signMessage(message);
      //console.log(signature)
      //console.log(message)
			return { publicAddress, signature };
		} catch (err) {
      window.alert('Please sign the message.')
			throw new Error(
				'Please sign the message.'
			);
		}
	};

	const handleAuthenticate = async ({
		publicAddress,
		signature,
	}) => {
		const r = await fetch(`${BACKEND}/auth`, {
			body: JSON.stringify({ publicAddress, signature }),
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
		})
    //console.log(r)
    const data =  await r.json()
    return data
  }


  async function initInfo() {
    try{
      // Access token is stored in localstorage
      const ls = window.localStorage.getItem(LS_KEY);
      const auth = ls && JSON.parse(ls);
      //console.log('*********')
      //console.log(auth)
    
      const web3Modal = new Web3Modal({
        network: "rinkeby",
        cacheProvider: true,
      });
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)    
      const signer = provider.getSigner()
      const curAcounttmp = await signer.getAddress();
      const curAcount = curAcounttmp.toLocaleLowerCase();
      setAcount(curAcount);
      //console.log(`-----> cur is :${curAcount}`)
      //console.log(`-----> cur is :${acount}`)
      // Look if user with current publicAddress is already present on backend
      const r1 = await fetch(
        `${BACKEND}/users?publicAddress=${curAcount}`
      )
      const data1 = await r1.json();
      //console.log('11111111111111')
      //console.log(data1)

      let needresign = false
      let a
      if(auth?.accessToken){
        const {
          payload: { id, publicAddress },
        } = jwtDecode(auth?.accessToken);
  
        if(publicAddress != curAcount){
          //console.log('need to resign')
          needresign = true
        }
      }
      
      if(!(auth?.accessToken) || needresign){
        //console.log('renew ---');
        const r2 = data1.length ? data1[0] : await handleSignup(curAcount)
        //console.log('222222222222222')
        //console.log(r2)
        const r3 = await handleSignMessage(r2)

        const r4 = await handleAuthenticate(r3)
        //console.log('r4 is as below')
        //console.log(r4)
        
        localStorage.setItem(LS_KEY, JSON.stringify(r4));
        setAuthstate(r4);
        a = r4
      }else{
        //console.log('no renew ---');
        //console.log(auth)
        setAuthstate(auth)
        a = auth
      }
      
      //console.log('----------authstate-----------')
      //console.log(authstate)

      const { accessToken } = a

      //console.log(`accessToken is ${accessToken}`);

      const {
        payload: { id, publicAddress },
      } = jwtDecode(accessToken);

      //console.log(`publicAddress is ${publicAddress}`)
      //console.log(`id is ${id}`);

      const r5 = await fetch(`${BACKEND}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      
      const user = await r5.json()
      //console.log('start to setstate -----')
      //console.log(user)
      setState(state => {return { ...state, ...user}})
      ////console.log(user)
      //console.log(state)
      setLoading(false)

    }catch (err) {
      //window.alert('Please sign the message.')
			//console.log(
				'Please sign the message.'
			);
		}

  }

	const modifyInfo = async () => {
		const { accessToken } = authstate;
		const { id, username,email } = state;
    //console.log('++++++++')
    //console.log({ id, username,email })
		if (!id) {
			window.alert(
				'The user id has not been fetched yet. Please try again in 5 seconds.'
			);
			return;
		}

		const r = await fetch(`${BACKEND}/users/${id}`, {
			body: JSON.stringify({ username, email }),
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			method: 'PATCH',
		})

    const userdata = await r.json()
    //console.log('modify ----');
    //console.log(userdata)
    //console.log(state)
		setState(state => {return { ...state, ...userdata}})
    setSetted(true)
	};

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <p className="text-1xl my-1 font-bold">Acount Address: {acount}</p>
        {loading && (<p className="text-1xl my-1 font-bold">Loading ...</p>)}
        { !loading && (
          <div>
            <p className="text-1xl my-1 font-bold">User Name:</p>
            <input
              size='70'
              placeholder={state.username? state.username: 'no asocciated data in RDB'}
              className="mt-8 border rounded p-4"
              onChange={e => setState({ ...state, username: e.target.value })}
            />
            <p className="text-1xl my-1 font-bold">User EMAIL: </p>
            <input
              size='70'
              placeholder={state.email? state.email: 'no asocciated data in RDB'}
              className="mt-2 border rounded p-4"
              onChange={e => setState({ ...state, email: e.target.value })}
            />
            <button onClick={modifyInfo} className="mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
              Update my profile
            </button>
            {setted && (<p className="text-1xl my-1 font-bold text-green-400">👌 Success uploaded information to RDB</p>)}
          </div>)
        }
      </div>
    </div>
  )
}
