import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import web3 from 'web3'
import axios from 'axios'
import Web3Modal from "web3modal"
import dao from '../config/PICGovernorDAO.json';
import nft from '../config/PICNFT.json';
import daotoken from '../config/DAOToken.json';
import { useRouter } from 'next/router'
const NETWORK_ID = 4;

const daotokenaddress = daotoken.networks[NETWORK_ID].address
const daotokenabi = daotoken.abi

const daoaddress = dao.networks[NETWORK_ID].address
const daoabi = dao.abi
//const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi

export default function Home() {
  const [proposes, setProposes] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  const [curAcount, setCurAcount] = useState('')
  const [blockn, setBlockn] = useState('')
  
  const [formInput, updateFormInput] = useState({support: '', reason:''})
  const [tx, setTx] = useState([])
  const [isok, setIsok] = useState(false)
  const [votep, setVotep] = useState('0')
  const router = useRouter()
  const p_states = ['Pending',
    'Active',
    'Canceled',
    'Defeated',
    'Succeeded',
    'Queued',
    'Expired',
    'Executed']

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      if(router.asPath == '/proposes'){
        loadNFTs()
      }
    })
    loadNFTs()
  }, [])

  async function go(propose, type) {
    const { support ,reason } = formInput
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const daoContract = new ethers.Contract(daoaddress, daoabi, signer)
  
    let transaction
    
    const value_p = new Array(propose.targets.length).fill(0);

    console.log(propose.targets)
    console.log(value_p)

    if(type == 'vote'){
      transaction = await daoContract.castVoteWithReason(propose.proposalId,support,reason)
    } else if(type == 'queue'){
      console.log(propose.targets);
      console.log(propose.calldatas);
      console.log(propose.description);
      console.log(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propose.description)));

      transaction = await daoContract.queue(propose.targets,value_p, propose.calldatas,ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propose.description)))
    } else if(type == 'execute'){
      transaction = await daoContract.execute(propose.targets,value_p, propose.calldatas,ethers.utils.keccak256(ethers.utils.toUtf8Bytes(propose.description)))
    }

    setTx([propose.proposalId.toString(),type])
    await transaction.wait()
    loadNFTs()
  }

  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const chainid = await provider.getNetwork()
    console.log(`chainid is ${chainid.chainId}`)
    if(chainid.chainId != 4){
      window.alert('Please change to Rinkeby network.')
      return
    }
    const signer = provider.getSigner()
    const cur = await signer.getAddress();
    setCurAcount(cur)
    setTx(null)

    //vote power
    const daotokenContract = new ethers.Contract(daotokenaddress, daotokenabi, signer)
    const blockn = await provider.getBlockNumber()
    setBlockn(blockn)
    //console.log(blockn)
    const vp = await daotokenContract.getVotes(cur)
    setVotep(vp.toString())

    const daoContract = new ethers.Contract(daoaddress, daoabi, signer)

    console.log(`${daoContract.address}`);

    let eventFilter = daoContract.filters.ProposalCreated()
    let events = await daoContract.queryFilter(eventFilter, 10884323, "latest")
    //console.log(events)
    

    const block = await provider.getBlock()
    console.log(block.timestamp);

    const ps = await Promise.all(events.map(async i => {
      const s = await daoContract.state(i.args.proposalId);
      const proposalVotes = await daoContract.proposalVotes(i.args.proposalId);
      const eta = await daoContract.proposalEta(i.args.proposalId);
      //const timestamp = ethers.utils.bigNumberify(block.timestamp);

      console.log(eta)
      console.log(eta.toString())

      if(!eta.eq(0) && eta.lte(block.timestamp)){
        console.log('lte');
        setIsok(true)
      }
      
      const hadvoted = await daoContract.hasVoted(i.args.proposalId, cur)

      let propose = {
        proposalId: i.args.proposalId.toString(),
        proposer: i.args.proposer,
        targets: i.args.targets,
        startBlock: i.args.startBlock.toString(),
        endBlock: i.args.endBlock.toString(),
        description: i.args.description,
        calldatas: i.args.calldatas,
        state: p_states[parseInt(s.toString())],
        forVotes: proposalVotes.forVotes.toString(),
        againstVotes: proposalVotes.againstVotes.toString(),
        hadvoted: hadvoted
      }
      //console.log(propose)
      return propose
    }))
    //console.log('items: ', items)
    ps.reverse();
    setProposes(ps)
    setLoaded('loaded')
  }

  if (loaded === 'loaded' && !proposes.length) return (<h1 className="p-20 text-4xl">No proposes!</h1>)

  return (
    <div>
    <p className="text-1xl my-1 text-pink-400 font-bold">Ethereum Rinkeby Current Block Height: {blockn}</p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            proposes.map((proposal, i) => (
              <div key={i} className="border p-4 shadow">
                <p className="text-1xl my-1 font-bold">📝 proposalId: {proposal.proposalId}</p>
                <p className="text-1xl my-1 font-bold">🧎 proposer: {proposal.proposer}</p>
                <p className="text-1xl my-1 font-bold">targets contract: {JSON.stringify(proposal.targets)}</p>
                <p className="text-1xl my-1 font-bold">calldatas: {JSON.stringify(proposal.calldatas)}</p>
                <p className="text-1xl my-1 font-bold">description: {proposal.description}</p>
                <p className="text-1xl my-1 font-bold">startBlock: {proposal.startBlock}</p>
                <p className="text-1xl my-1 font-bold">endBlock: {proposal.endBlock}</p>
                <p className="text-1xl my-1 text-pink-400 font-bold">state: {proposal.state}</p>
                <p className="text-1xl my-1 text-green-400 font-bold">forVotes: {proposal.forVotes}</p>
                <p className="text-1xl my-1 text-red-400 font-bold">againstVotes: {proposal.againstVotes}</p>
                {
                  (proposal.state == 'Active') &&
                  <div className="border p-4"> 
                    <input
                    size='30'
                    placeholder="Support(1:For, 0:Against)"
                    className="mt-1 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, support: e.target.value })}
                    />
                    <input
                      size='30'
                      placeholder="Reason"
                      className="mt-1 border rounded p-4"
                      onChange={e => updateFormInput({ ...formInput, reason: e.target.value })}
                    />
                    {proposal.hadvoted? <p className="text-1xl my-1 text-green-400 font-bold">👍👍👍 You Had Voted.</p> : <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => go(proposal, 'vote')}>Vote</button>}
                    <p className="text-1xl my-1 font-bold">　※ Your Vote Power: {votep}</p>
                  </div>
                }
                {
                  (proposal.state == 'Succeeded') &&
                  <div className="border p-4"> 
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => go(proposal, 'queue')}>Queue</button>
                  </div>
                }
                {
                  (proposal.state  == 'Queued' && isok) &&
                  <div className="border p-4"> 
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => go(proposal, 'execute')}>Execute</button>
                  </div>
                }
                {
                  tx && tx[0]==proposal.proposalId.toString() && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx[1]}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
                }
              </div>

            ))
          }
        </div>
      </div>
    </div>
    </div>
  )
}
