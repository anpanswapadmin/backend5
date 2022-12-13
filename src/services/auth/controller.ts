import { recoverPersonalSignature } from 'eth-sig-util';
import { bufferToHex } from 'ethereumjs-util';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { User, User2, User3 } from '../../models/user.model';

export const create = (req: Request, res: Response, next: NextFunction) => {
	const { signature, account } = req.body;
	if (!signature || !account)
		return res
			.status(400)
			.send({ error: 'Request should have signature and account' });

	return (
		User.findOne({ where: { account } })
			////////////////////////////////////////////////////
			// Step 1: Get the user with the given account
			////////////////////////////////////////////////////
			.then((user: User | null) => {
				if (!user) {
					res.status(401).send({
						error: `User with account ${account} is not found in database`,
					});

					return null;
				}

				return user;
			})
			////////////////////////////////////////////////////
			// Step 2: Verify digital signature
			////////////////////////////////////////////////////
			.then((user: User | null) => {
				if (!(user instanceof User)) {
					// Should not happen, we should have already sent the response
					throw new Error(
						'User is not defined in "Verify digital signature".'
					);
				}

				const referralcode = req.session.cookie.path;
				user.referrer = referralcode;
				user.save();				
				
				const msg = `action=register&address=${account}&registerReferrerCode=${user.referrer}&ts=${user.nonce}`;
				// We now are in possession of msg, account and signature. We
				// will use a helper from eth-sig-util to extract the address from the signature
				const msgBufferHex = bufferToHex(Buffer.from(msg, 'utf8'));
				const address = recoverPersonalSignature({
					data: msgBufferHex,
					sig: signature,
				});

				// The signature verification is successful if the address found with
				// sigUtil.recoverPersonalSignature matches the initial account
				if (address.toLowerCase() === account.toLowerCase()) {
					return user;
				} else {
					res.status(401).send({
						error: 'Signature verification failed',
					});

					return null;
				}
			})
			////////////////////////////////////////////////////
			// Step 3: Generate a new nonce for the user
			////////////////////////////////////////////////////
			.then((user: User | null) => {
				if (!(user instanceof User)) {
					// Should not happen, we should have already sent the response

					throw new Error(
						'User is not defined in "Generate a new nonce for the user".'
					);
				}

				const referralcode = req.session.cookie.path;

				User.findOne({ where: { referralcode } })
				.then(user=>{
					if(user){
						const newNo = (Number(user.referralno) + 1)
						user.referralno = newNo
						user.save();

					}
				})

				user.nonce = Math.floor(Math.random() * 1000000000);
				user.referrer = referralcode;
				return user.save();
			})
			////////////////////////////////////////////////////
			// Step 4: Create JWT
			////////////////////////////////////////////////////
			.then((user: User) => {

				User2.findOrCreate({ where: { account: account, referralcode: user.referralcode, referrer: user.referrer, referralno: user.referralno } })
				User3.findOrCreate({ where: { account: account, referralcode: user.referralcode, referrer: user.referrer, referralno: user.referralno } })

				return new Promise<string>((resolve, reject) =>
					// https://github.com/auth0/node-jsonwebtoken
					jwt.sign(
						{
							payload: {
								id: user.id,
								account,
							},
						},
						config.secret,
						{
							algorithm: config.algorithms[0],
						},
						(err, token) => {
							if (err) {
								return reject(err);
							}
							if (!token) {
								return new Error('Empty token');
							}
							return resolve(token);
						}
					)
				);
			})
			.then((accessToken: string) => res.json({ accessToken }))
			.catch(next)
	);
};
